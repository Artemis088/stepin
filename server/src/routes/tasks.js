import { Router } from 'express';
import db from '../db.js';
import { id, now, parseJson } from '../util.js';
import { authRequired, requireRole, authOptional } from '../auth.js';
import { serializeTask } from '../serialize.js';
import { notify } from '../logic.js';

const router = Router();

// Browse / discover tasks (students). Supports filters.
router.get('/', authOptional, (req, res) => {
  const { vertical, motive, paid, skill, q } = req.query;
  let rows = db.prepare(`SELECT * FROM tasks WHERE status IN ('live','screening') ORDER BY created_at DESC`).all();

  if (vertical) rows = rows.filter((t) => t.vertical === vertical);
  if (motive) rows = rows.filter((t) => t.motive === motive);
  if (paid === 'true') rows = rows.filter((t) => t.compensation_type === 'stipend');
  if (skill) rows = rows.filter((t) => parseJson(t.skills, []).some((s) => s.toLowerCase() === String(skill).toLowerCase()));
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((t) => t.title.toLowerCase().includes(needle) || t.description.toLowerCase().includes(needle));
  }

  const viewerId = req.user?.role === 'student' ? req.user.id : null;
  res.json({ tasks: rows.map((t) => serializeTask(t, viewerId)) });
});

// Single task detail
router.get('/:id', authOptional, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const viewerId = req.user?.role === 'student' ? req.user.id : null;
  const dto = serializeTask(task, viewerId);
  // include template preview
  if (task.template_id) {
    const tpl = db.prepare('SELECT id, name, est_minutes, questions FROM templates WHERE id = ?').get(task.template_id);
    if (tpl) dto.template = { id: tpl.id, name: tpl.name, estMinutes: tpl.est_minutes, questionCount: parseJson(tpl.questions, []).length };
  }
  // for a student, indicate verified skill matches inline (§3.5)
  if (viewerId) {
    const mySkills = db.prepare(`SELECT name, status FROM skills WHERE student_id = ?`).all(viewerId);
    dto.skillMatch = dto.skills.map((name) => {
      const mine = mySkills.find((s) => s.name.toLowerCase() === name.toLowerCase());
      return { name, have: !!mine, verified: mine?.status === 'verified' };
    });
  }
  res.json({ task: dto });
});

// Create a task (company). Enforces sensitivity gate + concurrent cap (§9).
router.post('/', authRequired, requireRole('company'), (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(req.user.id);
  const openCount = db
    .prepare(`SELECT COUNT(*) c FROM tasks WHERE company_id = ? AND status IN ('draft','live','screening','finalists_working')`)
    .get(req.user.id).c;

  const {
    title,
    description,
    doneLooksLike,
    vertical = 'data',
    skills = [],
    motive = 'needs_now',
    sampleDataConfirmed,
    compensationType = 'credential',
    stipendAmount = 0,
    appliedCap = 20,
    screeningCap = 10,
    newcomerSlots = 2,
    meritSlots = 3,
    applyInDays = 3,
    screeningInDays = 5,
    taskInDays = 10,
    decisionInDays = 13,
    publish = false,
  } = req.body || {};

  if (!title || !description || !doneLooksLike) {
    return res.status(400).json({ error: 'Title, description and "what done looks like" are required' });
  }
  if (publish && !sampleDataConfirmed) {
    return res.status(400).json({ error: 'You must confirm the task uses sample data only before publishing.' });
  }
  if (publish && openCount >= company.concurrent_cap) {
    return res.status(403).json({ error: `You're at your concurrent-task cap (${company.concurrent_cap}). Close or finish a task first.` });
  }

  const template = db.prepare('SELECT id FROM templates WHERE vertical = ? LIMIT 1').get(vertical);
  const mk = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + Number(days));
    return d.toISOString();
  };
  const tid = id();
  db.prepare(
    `INSERT INTO tasks
      (id, company_id, title, description, done_looks_like, vertical, skills, motive, sample_data_confirmed,
       compensation_type, stipend_amount, applied_cap, screening_cap, newcomer_slots, merit_slots, template_id,
       status, apply_deadline, screening_deadline, task_deadline, decision_deadline, sensitivity_ok, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`
  ).run(
    tid,
    req.user.id,
    title,
    description,
    doneLooksLike,
    vertical,
    JSON.stringify(skills),
    motive,
    sampleDataConfirmed ? 1 : 0,
    compensationType,
    compensationType === 'stipend' ? Number(stipendAmount) || 0 : 0,
    Number(appliedCap),
    Number(screeningCap),
    Number(newcomerSlots),
    Number(meritSlots),
    template?.id || null,
    publish ? 'live' : 'draft',
    mk(applyInDays),
    mk(screeningInDays),
    mk(taskInDays),
    mk(decisionInDays),
    now()
  );

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(tid);
  res.json({ task: serializeTask(task) });
});

// Update / publish a draft
router.patch('/:id', authRequired, requireRole('company'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task || task.company_id !== req.user.id) return res.status(404).json({ error: 'Task not found' });
  if (req.body.publish) {
    if (!task.sample_data_confirmed && !req.body.sampleDataConfirmed) {
      return res.status(400).json({ error: 'Confirm sample-data usage before publishing.' });
    }
    db.prepare(`UPDATE tasks SET status = 'live', sample_data_confirmed = 1 WHERE id = ?`).run(task.id);
  }
  const fresh = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id);
  res.json({ task: serializeTask(fresh) });
});

export default router;
