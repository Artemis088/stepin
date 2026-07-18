import { Router } from 'express';
import db from '../db.js';
import { id, now, parseJson, timeLeft } from '../util.js';
import { authRequired, requireRole } from '../auth.js';
import { serializeTask } from '../serialize.js';
import { autoScore, isNewcomer, notify, buildShortlist } from '../logic.js';

const router = Router();

const STAGE_ORDER = ['applied', 'screening', 'shortlist', 'task', 'defense', 'result'];

// Map an application's DB stage to the 6-step tracker used in the UI (§3.7)
function trackerFor(app) {
  const map = {
    interested: { step: 0, label: 'Applied', tone: 'active' },
    screening_submitted: { step: 1, label: 'Screening', tone: 'active' },
    shortlisted: { step: 2, label: 'Shortlisted', tone: 'good' },
    doing_task: { step: 3, label: 'Task', tone: 'active' },
    live_defense: { step: 4, label: 'Defense', tone: 'active' },
    awaiting_decision: { step: 5, label: 'Decision', tone: 'active' },
    won: { step: 5, label: 'Won', tone: 'good' },
    lost: { step: 5, label: 'Result', tone: 'muted' },
    not_selected: { step: 2, label: 'Not this time', tone: 'muted' },
    no_show: { step: 3, label: 'No-show', tone: 'bad' },
  };
  return map[app.stage] || { step: 0, label: app.stage, tone: 'muted' };
}

// --- Express interest -> grabs one of the applied slots (first-come) -------
router.post('/tasks/:taskId/apply', authRequired, requireRole('student'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!['live', 'screening'].includes(task.status)) return res.status(400).json({ error: 'Applications are closed for this task.' });
  if (timeLeft(task.apply_deadline)?.overdue) return res.status(400).json({ error: 'The application deadline has passed.' });

  const existing = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(task.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'You already applied to this task.', application: { id: existing.id, stage: existing.stage } });

  const appliedCount = db.prepare('SELECT COUNT(*) c FROM applications WHERE task_id = ?').get(task.id).c;
  if (appliedCount >= task.applied_cap) return res.status(400).json({ error: 'The applied cap is full for this task.' });

  const aid = id();
  db.prepare(`INSERT INTO applications (id, task_id, student_id, stage, applied_at) VALUES (?,?,?, 'interested', ?)`).run(
    aid,
    task.id,
    req.user.id,
    now()
  );
  res.json({ application: { id: aid, stage: 'interested' }, task: serializeTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id), req.user.id) });
});

// --- Get the screening template for a task (for the screening step screen) --
router.get('/tasks/:taskId/screening', authRequired, requireRole('student'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const app = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(task.id, req.user.id);
  if (!app) return res.status(403).json({ error: 'Express interest first.' });
  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(task.template_id);
  if (!tpl) return res.status(404).json({ error: 'No screening template configured.' });

  // Blind: strip answer keys before sending to the student
  const questions = parseJson(tpl.questions, []).map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    unit: q.unit,
    maxChars: q.maxChars,
    reviewedBy: q.type === 'reasoning' ? 'company' : 'auto',
  }));

  const screenedCount = db
    .prepare(`SELECT COUNT(*) c FROM applications WHERE task_id = ? AND screening_submitted_at IS NOT NULL`)
    .get(task.id).c;

  res.json({
    task: { id: task.id, title: task.title },
    template: { id: tpl.id, name: tpl.name, estMinutes: tpl.est_minutes },
    questions,
    alreadySubmitted: !!app.screening_submitted_at,
    slot: { taken: screenedCount, cap: task.screening_cap, next: Math.min(screenedCount + 1, task.screening_cap) },
    screeningDeadline: task.screening_deadline,
    countdown: timeLeft(task.screening_deadline),
  });
});

// --- Submit the screening -> claims a screening slot on completion (§8.1) ---
router.post('/tasks/:taskId/screening', authRequired, requireRole('student'), (req, res) => {
  const { answers = {} } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const app = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(task.id, req.user.id);
  if (!app) return res.status(403).json({ error: 'Express interest first.' });
  if (app.screening_submitted_at) return res.status(409).json({ error: 'You already submitted your screening.' });
  if (timeLeft(task.screening_deadline)?.overdue) return res.status(400).json({ error: 'The screening deadline has passed.' });

  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(task.template_id);

  // Screening cap fills by who COMPLETES first, with reserved newcomer slots.
  const completed = db
    .prepare(`SELECT student_id FROM applications WHERE task_id = ? AND screening_submitted_at IS NOT NULL`)
    .all(task.id);
  const newcomerHere = isNewcomer(req.user.id);
  const newcomerCompleted = completed.filter((c) => isNewcomer(c.student_id)).length;
  const generalTaken = completed.length;

  const generalCap = task.screening_cap - task.newcomer_slots;
  const roomGeneral = generalTaken - newcomerCompleted < generalCap; // seats not reserved
  const roomNewcomer = newcomerHere && newcomerCompleted < task.newcomer_slots;

  if (completed.length >= task.screening_cap && !roomNewcomer) {
    return res.status(400).json({ error: 'All screening slots are full.' });
  }
  if (!roomGeneral && !roomNewcomer) {
    return res.status(400).json({ error: 'The general screening slots are full; only newcomer slots remain.' });
  }

  const auto = tpl ? autoScore(tpl, answers) : 1;
  // rank_score starts as the auto portion; the company's reasoning review adds to it.
  db.prepare(
    `UPDATE applications
       SET stage = 'screening_submitted', screening_answers = ?, screening_auto_score = ?,
           rank_score = ?, screening_submitted_at = ?
     WHERE id = ?`
  ).run(JSON.stringify(answers), auto, auto, now(), app.id);

  if (task.status === 'live') db.prepare(`UPDATE tasks SET status = 'screening' WHERE id = ?`).run(task.id);

  notify(task.company_id, {
    type: 'screening',
    title: 'New screening submitted',
    body: `A candidate completed the screening for "${task.title}".`,
    icon: 'ti-forms',
    link: `/company/tasks/${task.id}`,
  });

  const taken = db.prepare(`SELECT COUNT(*) c FROM applications WHERE task_id = ? AND screening_submitted_at IS NOT NULL`).get(task.id).c;
  res.json({ ok: true, slotTaken: taken, cap: task.screening_cap, autoScore: auto });
});

// --- My applications (funnel tracker) ------------------------------------
router.get('/me', authRequired, requireRole('student'), (req, res) => {
  const apps = db.prepare('SELECT * FROM applications WHERE student_id = ? ORDER BY applied_at DESC').all(req.user.id);
  const out = apps.map((a) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(a.task_id);
    const company = db.prepare('SELECT name, initials FROM companies WHERE user_id = ?').get(task.company_id);
    let nextDeadline = null;
    if (a.stage === 'interested') nextDeadline = { label: 'Screening due', ...timeLeft(task.screening_deadline) };
    else if (a.stage === 'screening_submitted') nextDeadline = { label: 'Shortlist', ...timeLeft(task.screening_deadline) };
    else if (['shortlisted', 'doing_task'].includes(a.stage)) nextDeadline = { label: 'Task due', ...timeLeft(task.task_deadline) };
    else if (['live_defense', 'awaiting_decision'].includes(a.stage)) nextDeadline = { label: 'Decision', ...timeLeft(task.decision_deadline) };
    return {
      id: a.id,
      taskId: task.id,
      taskTitle: task.title,
      company: company?.name,
      companyInitials: company?.initials,
      stage: a.stage,
      tracker: trackerFor(a),
      steps: STAGE_ORDER,
      isNewcomerSlot: !!a.is_newcomer_slot,
      nextDeadline,
      reputationAwarded: a.reputation_awarded,
      badgeAwarded: a.badge_awarded,
      submitted: !!a.submitted_at,
      termsAccepted: !!a.terms_accepted,
    };
  });
  res.json({ applications: out });
});

// --- Finalist workspace: get brief + terms + my submission state ----------
router.get('/tasks/:taskId/workspace', authRequired, requireRole('student'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const app = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(task.id, req.user.id);
  if (!app || !['shortlisted', 'doing_task', 'live_defense', 'awaiting_decision', 'won', 'lost'].includes(app.stage)) {
    return res.status(403).json({ error: 'You are not a finalist on this task.' });
  }
  res.json({
    task: serializeTask(task, req.user.id),
    application: {
      id: app.id,
      stage: app.stage,
      termsAccepted: !!app.terms_accepted,
      deliverable: {
        name: app.deliverable_name,
        summary: app.deliverable_summary,
        link: app.deliverable_link,
        text: app.deliverable_text,
      },
      submittedAt: app.submitted_at,
      defense: { slot: app.defense_slot, link: app.defense_link, minutes: app.defense_minutes },
    },
    terms: {
      transfers: 'Ownership of the delivered work transfers to the company upon a signed IP assignment, if selected.',
      portfolioCarveout: 'You keep the right to show this work in your portfolio, always (mandatory carve-out).',
      payment: task.compensation_type === 'stipend' ? `Stipend of $${task.stipend_amount} on assignment.` : 'Credential, badge and portfolio piece (no stipend on this task).',
    },
    taskCountdown: timeLeft(task.task_deadline),
  });
});

// --- Accept per-task terms (settled BEFORE the task, §8.8) -----------------
router.post('/tasks/:taskId/accept-terms', authRequired, requireRole('student'), (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(req.params.taskId, req.user.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  db.prepare(`UPDATE applications SET terms_accepted = 1, stage = CASE WHEN stage = 'shortlisted' THEN 'doing_task' ELSE stage END WHERE id = ?`).run(app.id);
  res.json({ ok: true });
});

// --- Submit the deliverable ----------------------------------------------
router.post('/tasks/:taskId/submit', authRequired, requireRole('student'), (req, res) => {
  const { name, summary, link = '', text = '' } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  const app = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(req.params.taskId, req.user.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (!app.terms_accepted) return res.status(400).json({ error: 'Accept the per-task terms before submitting.' });
  if (!name && !link && !text) return res.status(400).json({ error: 'Provide a file name, a link, or text for your deliverable.' });

  db.prepare(
    `UPDATE applications
       SET deliverable_name = ?, deliverable_summary = ?, deliverable_link = ?, deliverable_text = ?,
           submitted_at = ?, stage = 'live_defense'
     WHERE id = ?`
  ).run(name || 'submission', summary || '', link, text, now(), app.id);

  notify(task.company_id, {
    type: 'submission',
    title: 'Finalist submitted their work',
    body: `A finalist submitted a deliverable for "${task.title}".`,
    icon: 'ti-file-upload',
    link: `/company/shortlist/${task.id}`,
  });
  res.json({ ok: true });
});

// --- Schedule / record live defense (finalists only, §8.5) ----------------
router.post('/tasks/:taskId/defense', authRequired, requireRole('student'), (req, res) => {
  const { slot, link = '', minutes = 12 } = req.body || {};
  const app = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(req.params.taskId, req.user.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  db.prepare(`UPDATE applications SET defense_slot = ?, defense_link = ?, defense_minutes = ?, stage = 'awaiting_decision' WHERE id = ?`).run(
    slot || null,
    link,
    Number(minutes) || 12,
    app.id
  );
  res.json({ ok: true });
});

export default router;
