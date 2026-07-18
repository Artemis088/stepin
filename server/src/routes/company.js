import { Router } from 'express';
import db from '../db.js';
import { id, now, parseJson, timeLeft, initials } from '../util.js';
import { authRequired, requireRole } from '../auth.js';
import { serializeTask, taskCounts, serializeStudent } from '../serialize.js';
import { buildShortlist, awardFromRating, reviewCompanyStanding, notify, logIncident } from '../logic.js';

const router = Router();

// --- Dashboard (probation banner, active tasks, cap usage) ----------------
router.get('/dashboard', authRequired, requireRole('company'), (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(req.user.id);
  const tasks = db.prepare('SELECT * FROM tasks WHERE company_id = ? ORDER BY created_at DESC').all(req.user.id);
  const openCount = tasks.filter((t) => ['draft', 'live', 'screening', 'finalists_working'].includes(t.status)).length;

  const active = tasks.map((t) => {
    const counts = taskCounts(t.id);
    const shortlistReady = t.status === 'finalists_working';
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      counts,
      appliedCap: t.applied_cap,
      screeningCap: t.screening_cap,
      shortlistReady,
      nextDeadline:
        t.status === 'finalists_working'
          ? { label: 'You decide by', ...timeLeft(t.decision_deadline), critical: true }
          : t.status === 'screening'
          ? { label: 'Screening due', ...timeLeft(t.screening_deadline) }
          : t.status === 'live'
          ? { label: 'Applications close', ...timeLeft(t.apply_deadline) }
          : null,
    };
  });

  res.json({
    company: {
      name: company.name,
      status: company.status,
      concurrentCap: company.concurrent_cap,
      openCount,
      canPost: openCount < company.concurrent_cap,
    },
    tasks: active,
  });
});

// --- My tasks list --------------------------------------------------------
router.get('/tasks', authRequired, requireRole('company'), (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE company_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ tasks: tasks.map((t) => serializeTask(t)) });
});

// --- Single task funnel management ---------------------------------------
router.get('/tasks/:id', authRequired, requireRole('company'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task || task.company_id !== req.user.id) return res.status(404).json({ error: 'Task not found' });
  const apps = db.prepare('SELECT * FROM applications WHERE task_id = ?').all(task.id);
  const stageCounts = {};
  for (const a of apps) stageCounts[a.stage] = (stageCounts[a.stage] || 0) + 1;

  // screenings needing the company's reasoning review (blind — no identity, §8.3)
  const pendingReview = apps
    .filter((a) => a.stage === 'screening_submitted')
    .map((a) => {
      const answers = parseJson(a.screening_answers, {});
      const tpl = db.prepare('SELECT questions FROM templates WHERE id = ?').get(task.template_id);
      const questions = parseJson(tpl?.questions, []);
      const reasoning = questions.find((q) => q.type === 'reasoning');
      return {
        applicationId: a.id,
        autoScore: a.screening_auto_score,
        reasoningPrompt: reasoning?.prompt,
        reasoningAnswer: reasoning ? answers[reasoning.id] : null,
        reasoningScore: a.reasoning_score,
        blindLabel: `Candidate ${a.id.slice(0, 4).toUpperCase()}`,
      };
    });

  res.json({
    task: serializeTask(task),
    stageCounts,
    pendingReview,
    canBuildShortlist: task.status === 'screening' || (task.status === 'live' && pendingReview.length > 0),
  });
});

// --- Score a reasoning item (light human judgement, blind) -----------------
router.post('/applications/:appId/review', authRequired, requireRole('company'), (req, res) => {
  const { reasoningScore, note = '' } = req.body || {};
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.appId);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(app.task_id);
  if (task.company_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });

  const rs = Math.max(0, Math.min(1, Number(reasoningScore)));
  // combine auto (60%) + reasoning (40%) into the blind rank score
  const combined = (app.screening_auto_score ?? 0) * 0.6 + rs * 0.4;
  db.prepare('UPDATE applications SET reasoning_score = ?, reasoning_review = ?, rank_score = ? WHERE id = ?').run(
    rs,
    note,
    combined,
    app.id
  );
  res.json({ ok: true, rankScore: combined });
});

// --- Build the shortlist (applies merit + newcomer slot rule) --------------
router.post('/tasks/:id/shortlist', authRequired, requireRole('company'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task || task.company_id !== req.user.id) return res.status(404).json({ error: 'Task not found' });
  const n = buildShortlist(task);
  res.json({ ok: true, shortlisted: n });
});

// --- Shortlist review (finalist deliverables; reputation as context only) ---
router.get('/tasks/:id/shortlist', authRequired, requireRole('company'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task || task.company_id !== req.user.id) return res.status(404).json({ error: 'Task not found' });

  const finalists = db
    .prepare(`SELECT * FROM applications WHERE task_id = ? AND stage IN ('shortlisted','doing_task','live_defense','awaiting_decision','won','lost')`)
    .all(task.id);

  const cards = finalists.map((a) => {
    const student = db.prepare('SELECT * FROM students WHERE user_id = ?').get(a.student_id);
    const isNew = (student?.tasks_completed ?? 0) === 0;
    const ratingRows = db.prepare(`SELECT * FROM ratings WHERE subject_user = ? AND subject_role = 'student'`).all(a.student_id);
    return {
      applicationId: a.id,
      studentId: a.student_id,
      name: student?.name,
      initials: student?.photo_initials,
      newcomerSlot: !!a.is_newcomer_slot,
      stage: a.stage,
      deliverable: a.submitted_at
        ? { name: a.deliverable_name, summary: a.deliverable_summary, link: a.deliverable_link, text: a.deliverable_text }
        : null,
      submittedAt: a.submitted_at,
      defense: a.defense_slot || a.defense_link ? { link: a.defense_link, minutes: a.defense_minutes } : null,
      // Reputation shown ONLY as muted context, prefixed "Context" (§8.5 / Stage 7)
      context: isNew
        ? { newcomer: true, text: 'new to StepIn · no history yet' }
        : { newcomer: false, reputation: student?.reputation, rating: ratingRows.length ? undefined : null, tasks: student?.tasks_completed },
    };
  });

  res.json({
    task: { id: task.id, title: task.title, status: task.status },
    decisionCountdown: timeLeft(task.decision_deadline),
    finalists: cards,
    decided: task.status === 'decided',
  });
});

// --- Select a winner -> triggers IP assignment (§8.8) ----------------------
router.post('/tasks/:id/select', authRequired, requireRole('company'), (req, res) => {
  const { applicationId } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task || task.company_id !== req.user.id) return res.status(404).json({ error: 'Task not found' });
  const winner = db.prepare('SELECT * FROM applications WHERE id = ? AND task_id = ?').get(applicationId, task.id);
  if (!winner) return res.status(404).json({ error: 'Finalist not found' });

  db.prepare(`UPDATE applications SET stage = 'won' WHERE id = ?`).run(winner.id);
  db.prepare(`UPDATE applications SET stage = 'lost' WHERE task_id = ? AND id != ? AND stage IN ('shortlisted','doing_task','live_defense','awaiting_decision')`).run(
    task.id,
    winner.id
  );
  db.prepare(`UPDATE tasks SET status = 'decided' WHERE id = ?`).run(task.id);

  // Create the IP assignment agreement (terms already shown up front)
  const agId = id();
  db.prepare(
    `INSERT INTO agreements (id, task_id, student_id, company_id, terms, portfolio_carveout, payment_amount, created_at)
     VALUES (?,?,?,?,?,1,?,?)`
  ).run(
    agId,
    task.id,
    winner.student_id,
    req.user.id,
    `Ownership of the deliverable for "${task.title}" transfers to the company on mutual signature. The student retains a permanent portfolio carve-out.`,
    task.compensation_type === 'stipend' ? task.stipend_amount : 0,
    now()
  );

  notify(winner.student_id, {
    type: 'won',
    title: task.is_internship ? "You're hired into the internship" : 'You were selected',
    body: task.is_internship
      ? `You won "${task.title}" and are hired into the internship. Sign the IP assignment to finalise.`
      : `You won "${task.title}". Sign the IP assignment to finalise.`,
    icon: 'ti-trophy',
    link: `/student/agreement/${agId}`,
  });
  // kind non-winner handling
  const losers = db.prepare(`SELECT student_id FROM applications WHERE task_id = ? AND stage = 'lost'`).all(task.id);
  for (const l of losers) {
    notify(l.student_id, {
      type: 'result',
      title: 'Not selected this time',
      body: `The company chose another finalist for "${task.title}". Your work stays in your portfolio.`,
      icon: 'ti-mood-neutral',
      link: '/student/applications',
    });
  }
  reviewCompanyStanding(req.user.id);
  res.json({ ok: true, agreementId: agId });
});

// --- Pass on all (still counts toward decision deadline) -------------------
router.post('/tasks/:id/pass', authRequired, requireRole('company'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task || task.company_id !== req.user.id) return res.status(404).json({ error: 'Task not found' });
  db.prepare(`UPDATE applications SET stage = 'lost' WHERE task_id = ? AND stage IN ('shortlisted','doing_task','live_defense','awaiting_decision')`).run(task.id);
  db.prepare(`UPDATE tasks SET status = 'decided' WHERE id = ?`).run(task.id);
  const finalists = db.prepare(`SELECT student_id FROM applications WHERE task_id = ? AND stage = 'lost'`).all(task.id);
  for (const f of finalists) {
    notify(f.student_id, {
      type: 'result',
      title: 'Company passed on all finalists',
      body: `No winner was chosen for "${task.title}". Your work stays in your portfolio.`,
      icon: 'ti-mood-neutral',
      link: '/student/applications',
    });
  }
  reviewCompanyStanding(req.user.id);
  res.json({ ok: true });
});

// --- Rate finalists (structured; platform auto-issues badges) --------------
router.get('/tasks/:id/rate', authRequired, requireRole('company'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task || task.company_id !== req.user.id) return res.status(404).json({ error: 'Task not found' });
  const finalists = db
    .prepare(`SELECT * FROM applications WHERE task_id = ? AND stage IN ('won','lost')`)
    .all(task.id)
    .map((a) => {
      const student = db.prepare('SELECT name, photo_initials FROM students WHERE user_id = ?').get(a.student_id);
      const existing = db
        .prepare('SELECT * FROM ratings WHERE task_id = ? AND subject_user = ? AND from_user = ?')
        .get(task.id, a.student_id, req.user.id);
      return {
        applicationId: a.id,
        studentId: a.student_id,
        name: student?.name,
        initials: student?.photo_initials,
        won: a.stage === 'won',
        rated: !!existing,
      };
    });
  res.json({ task: { id: task.id, title: task.title }, finalists });
});

router.post('/tasks/:id/rate', authRequired, requireRole('company'), (req, res) => {
  const { studentId, quality, communication, metDeadline, note = '' } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task || task.company_id !== req.user.id) return res.status(404).json({ error: 'Task not found' });
  const app = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(task.id, studentId);
  if (!app) return res.status(404).json({ error: 'Finalist not found' });
  const existing = db.prepare('SELECT id FROM ratings WHERE task_id = ? AND subject_user = ? AND from_user = ?').get(task.id, studentId, req.user.id);
  if (existing) return res.status(409).json({ error: 'Already rated this finalist.' });

  db.prepare(
    `INSERT INTO ratings (id, task_id, from_user, subject_user, subject_role, quality, communication, met_deadline, note, created_at)
     VALUES (?,?,?,?, 'student', ?,?,?,?,?)`
  ).run(id(), task.id, req.user.id, studentId, quality, communication, metDeadline, note, now());

  const rep = awardFromRating(app, task, { quality, communication, met_deadline: metDeadline }, app.stage === 'won');

  // Add a portfolio piece for the finalist (carve-out) if won
  if (app.stage === 'won') {
    const company = db.prepare('SELECT name FROM companies WHERE user_id = ?').get(req.user.id);
    db.prepare(
      `INSERT INTO portfolio (id, student_id, title, company_name, confidential, role, task_id, created_at) VALUES (?,?,?,?,0,?,?,?)`
    ).run(id(), studentId, task.title, company?.name, task.vertical, task.id, now());
  }
  res.json({ ok: true, reputationAwarded: rep });
});

// --- Company profile (two-sided reputation) -------------------------------
router.get('/profile/:id', authRequired, (req, res) => {
  const c = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  const tasks = db.prepare('SELECT id, title, status, created_at FROM tasks WHERE company_id = ? ORDER BY created_at DESC').all(req.params.id);
  const selections = db
    .prepare(`SELECT COUNT(*) c FROM applications a JOIN tasks t ON a.task_id = t.id WHERE t.company_id = ? AND a.stage = 'won'`)
    .get(req.params.id).c;
  const ratingRows = db.prepare(`SELECT * FROM ratings WHERE subject_user = ? AND subject_role = 'company'`).all(req.params.id);
  const dims = ['quality', 'communication', 'met_deadline'];
  let sum = 0,
    n = 0;
  for (const r of ratingRows) for (const d of dims) if (r[d] != null) (sum += r[d]), n++;
  res.json({
    company: {
      id: req.params.id,
      name: c.name,
      initials: c.initials,
      website: c.website,
      verified: !!c.verified,
      status: c.status,
      concurrentCap: c.concurrent_cap,
      rating: n ? Math.round((sum / n) * 10) / 10 : null,
      ratingsCount: ratingRows.length,
      tasksPosted: tasks.length,
      selections,
      tasks,
    },
  });
});

// Update own company profile
router.patch('/profile', authRequired, requireRole('company'), (req, res) => {
  const { name, website, contactName } = req.body || {};
  const c = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(req.user.id);
  db.prepare('UPDATE companies SET name = ?, website = ?, contact_name = ?, initials = ? WHERE user_id = ?').run(
    name ?? c.name,
    website ?? c.website,
    contactName ?? c.contact_name,
    name ? initials(name) : c.initials,
    req.user.id
  );
  res.json({ ok: true });
});

export default router;
