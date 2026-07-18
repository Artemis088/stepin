import { Router } from 'express';
import db from '../db.js';
import { id, now, parseJson } from '../util.js';
import { authRequired, requireRole } from '../auth.js';
import { reviewCompanyStanding, notify, logIncident } from '../logic.js';

const router = Router();
router.use(authRequired, requireRole('admin'));

// --- Overview -------------------------------------------------------------
router.get('/overview', (_req, res) => {
  const companies = db.prepare('SELECT COUNT(*) c FROM companies').get().c;
  const students = db.prepare('SELECT COUNT(*) c FROM students').get().c;
  const tasks = db.prepare('SELECT COUNT(*) c FROM tasks').get().c;
  const openIncidents = db.prepare(`SELECT COUNT(*) c FROM incidents WHERE status = 'open'`).get().c;
  const probation = db.prepare(`SELECT COUNT(*) c FROM companies WHERE status = 'probation'`).get().c;
  const flagged = db.prepare(`SELECT COUNT(*) c FROM companies WHERE status = 'flagged'`).get().c;
  res.json({ stats: { companies, students, tasks, openIncidents, probation, flagged } });
});

// --- 5.1 Company vetting & probation queue --------------------------------
router.get('/companies', (_req, res) => {
  const rows = db.prepare('SELECT * FROM companies ORDER BY status').all();
  const out = rows.map((c) => {
    const tasksPosted = db.prepare('SELECT COUNT(*) c FROM tasks WHERE company_id = ?').get(c.user_id).c;
    const selections = db
      .prepare(`SELECT COUNT(*) c FROM applications a JOIN tasks t ON a.task_id = t.id WHERE t.company_id = ? AND a.stage = 'won'`)
      .get(c.user_id).c;
    const missed = db.prepare(`SELECT COUNT(*) c FROM incidents WHERE subject_user = ? AND type = 'decision_missed'`).get(c.user_id).c;
    return {
      id: c.user_id,
      name: c.name,
      registrationId: c.registration_id,
      website: c.website,
      contactEmail: c.contact_email,
      status: c.status,
      verified: !!c.verified,
      concurrentCap: c.concurrent_cap,
      agreementSigned: !!c.agreement_signed,
      tasksPosted,
      selections,
      missedDecisions: missed,
      harvestSignal: tasksPosted >= 3 && selections === 0,
    };
  });
  res.json({ companies: out });
});

router.post('/companies/:id/status', (req, res) => {
  const { status, cap } = req.body || {};
  const c = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  const newStatus = status || c.status;
  const newCap = cap != null ? Number(cap) : c.concurrent_cap;
  db.prepare('UPDATE companies SET status = ?, concurrent_cap = ?, verified = ? WHERE user_id = ?').run(
    newStatus,
    newCap,
    newStatus === 'trusted' ? 1 : c.verified,
    req.params.id
  );
  notify(req.params.id, {
    type: 'probation',
    title: 'Account standing updated',
    body: `Your status is now "${newStatus}" with a concurrent-task cap of ${newCap}.`,
    icon: 'ti-shield-check',
  });
  res.json({ ok: true });
});

router.post('/companies/:id/review', (req, res) => {
  const result = reviewCompanyStanding(req.params.id);
  res.json({ ok: true, result });
});

// --- 5.2 Task sensitivity moderation -------------------------------------
router.get('/tasks', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC`).all();
  const out = rows.map((t) => {
    const company = db.prepare('SELECT name FROM companies WHERE user_id = ?').get(t.company_id);
    return {
      id: t.id,
      title: t.title,
      company: company?.name,
      vertical: t.vertical,
      status: t.status,
      sampleDataConfirmed: !!t.sample_data_confirmed,
      sensitivityOk: !!t.sensitivity_ok,
      description: t.description,
    };
  });
  res.json({ tasks: out });
});

router.post('/tasks/:id/block', (req, res) => {
  const { reason = 'Task appears to use real/sensitive data.' } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  db.prepare(`UPDATE tasks SET status = 'blocked', sensitivity_ok = 0 WHERE id = ?`).run(task.id);
  logIncident('sensitivity', task.id, task.company_id, reason);
  notify(task.company_id, { type: 'sensitivity', title: 'Task blocked', body: `"${task.title}" was blocked: ${reason}`, icon: 'ti-shield-x' });
  res.json({ ok: true });
});

router.post('/tasks/:id/clear', (req, res) => {
  db.prepare(`UPDATE tasks SET sensitivity_ok = 1 WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// --- 5.3 Screening template management -----------------------------------
router.get('/templates', (_req, res) => {
  const rows = db.prepare('SELECT * FROM templates ORDER BY vertical').all();
  res.json({
    templates: rows.map((t) => ({
      id: t.id,
      vertical: t.vertical,
      name: t.name,
      estMinutes: t.est_minutes,
      questions: parseJson(t.questions, []),
    })),
  });
});

router.post('/templates', (req, res) => {
  const { vertical, name, estMinutes = 30, questions = [] } = req.body || {};
  if (!vertical || !name) return res.status(400).json({ error: 'Vertical and name are required' });
  const tid = id();
  db.prepare('INSERT INTO templates (id, vertical, name, est_minutes, questions, created_at) VALUES (?,?,?,?,?,?)').run(
    tid,
    vertical,
    name,
    Number(estMinutes),
    JSON.stringify(questions),
    now()
  );
  res.json({ ok: true, id: tid });
});

router.patch('/templates/:id', (req, res) => {
  const { name, estMinutes, questions } = req.body || {};
  const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  db.prepare('UPDATE templates SET name = ?, est_minutes = ?, questions = ? WHERE id = ?').run(
    name ?? t.name,
    estMinutes != null ? Number(estMinutes) : t.est_minutes,
    questions != null ? JSON.stringify(questions) : t.questions,
    t.id
  );
  res.json({ ok: true });
});

// --- 5.4 Blind scoring & shortlist configuration -------------------------
router.get('/shortlist-config', (_req, res) => {
  const tasks = db
    .prepare(`SELECT id, title, merit_slots, newcomer_slots, screening_cap, applied_cap, status FROM tasks ORDER BY created_at DESC`)
    .all();
  res.json({ tasks });
});

router.patch('/tasks/:id/slots', (req, res) => {
  const { meritSlots, newcomerSlots } = req.body || {};
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  db.prepare('UPDATE tasks SET merit_slots = ?, newcomer_slots = ? WHERE id = ?').run(
    meritSlots != null ? Number(meritSlots) : t.merit_slots,
    newcomerSlots != null ? Number(newcomerSlots) : t.newcomer_slots,
    t.id
  );
  res.json({ ok: true });
});

// --- 5.5 Disputes & no-shows ---------------------------------------------
router.get('/incidents', (_req, res) => {
  const rows = db.prepare('SELECT * FROM incidents ORDER BY created_at DESC').all();
  const out = rows.map((i) => {
    const subject = i.subject_user ? db.prepare('SELECT role FROM users WHERE id = ?').get(i.subject_user) : null;
    let subjectName = null;
    if (subject?.role === 'student') subjectName = db.prepare('SELECT name FROM students WHERE user_id = ?').get(i.subject_user)?.name;
    if (subject?.role === 'company') subjectName = db.prepare('SELECT name FROM companies WHERE user_id = ?').get(i.subject_user)?.name;
    const task = i.task_id ? db.prepare('SELECT title FROM tasks WHERE id = ?').get(i.task_id) : null;
    return { ...i, subjectName, taskTitle: task?.title };
  });
  res.json({ incidents: out });
});

router.post('/incidents/:id/resolve', (req, res) => {
  db.prepare(`UPDATE incidents SET status = 'resolved' WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// Promote a backup from the shortlist after a no-show (§12)
router.post('/tasks/:id/promote-backup', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const backup = db
    .prepare(`SELECT * FROM applications WHERE task_id = ? AND stage = 'not_selected' ORDER BY rank_score DESC LIMIT 1`)
    .get(task.id);
  if (!backup) return res.status(400).json({ error: 'No backup available in the shortlist pool.' });
  db.prepare(`UPDATE applications SET stage = 'shortlisted' WHERE id = ?`).run(backup.id);
  notify(backup.student_id, {
    type: 'shortlisted',
    title: 'Promoted to finalist',
    body: `A slot opened on "${task.title}" and you were promoted from the shortlist.`,
    icon: 'ti-arrow-up',
    link: `/student/workspace/${task.id}`,
  });
  res.json({ ok: true });
});

export default router;
