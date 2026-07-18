import { Router } from 'express';
import db from '../db.js';
import { id, now } from '../util.js';
import { authRequired, requireRole } from '../auth.js';
import { notify } from '../logic.js';

const router = Router();

/* ---------------------------- IP assignment ----------------------------- */
router.get('/agreements/:id', authRequired, (req, res) => {
  const ag = db.prepare('SELECT * FROM agreements WHERE id = ?').get(req.params.id);
  if (!ag) return res.status(404).json({ error: 'Agreement not found' });
  if (![ag.student_id, ag.company_id].includes(req.user.id)) return res.status(403).json({ error: 'Not a party to this agreement' });
  const task = db.prepare('SELECT title, compensation_type, stipend_amount FROM tasks WHERE id = ?').get(ag.task_id);
  const student = db.prepare('SELECT name FROM students WHERE user_id = ?').get(ag.student_id);
  const company = db.prepare('SELECT name FROM companies WHERE user_id = ?').get(ag.company_id);
  res.json({
    agreement: {
      id: ag.id,
      taskId: ag.task_id,
      taskTitle: task?.title,
      studentName: student?.name,
      companyName: company?.name,
      terms: ag.terms,
      portfolioCarveout: !!ag.portfolio_carveout,
      paymentAmount: ag.payment_amount,
      studentSigned: !!ag.student_signed,
      companySigned: !!ag.company_signed,
      complete: !!ag.student_signed && !!ag.company_signed,
      myRole: req.user.id === ag.student_id ? 'student' : 'company',
    },
  });
});

router.post('/agreements/:id/sign', authRequired, (req, res) => {
  const ag = db.prepare('SELECT * FROM agreements WHERE id = ?').get(req.params.id);
  if (!ag) return res.status(404).json({ error: 'Agreement not found' });
  if (req.user.id === ag.student_id) db.prepare('UPDATE agreements SET student_signed = 1 WHERE id = ?').run(ag.id);
  else if (req.user.id === ag.company_id) db.prepare('UPDATE agreements SET company_signed = 1 WHERE id = ?').run(ag.id);
  else return res.status(403).json({ error: 'Not a party to this agreement' });

  const fresh = db.prepare('SELECT * FROM agreements WHERE id = ?').get(ag.id);
  if (fresh.student_signed && fresh.company_signed) {
    const other = req.user.id === ag.student_id ? ag.company_id : ag.student_id;
    notify(other, { type: 'agreement', title: 'IP assignment complete', body: 'Both parties signed — ownership transfers per the contract.', icon: 'ti-file-check' });
  }
  res.json({ ok: true, complete: !!fresh.student_signed && !!fresh.company_signed });
});

/* --------------------------- Notifications ------------------------------ */
router.get('/notifications', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  const unread = rows.filter((r) => !r.read).length;
  res.json({ notifications: rows.map((r) => ({ ...r, read: !!r.read })), unread });
});

router.post('/notifications/read', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

/* ---------------- Student rates the company (two-sided) ----------------- */
router.post('/ratings/company', authRequired, requireRole('student'), (req, res) => {
  const { taskId, quality, communication, metDeadline, note = '' } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const app = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(taskId, req.user.id);
  if (!app || !['won', 'lost', 'no_show'].includes(app.stage)) return res.status(403).json({ error: 'You can only rate after a decision.' });
  const existing = db.prepare('SELECT id FROM ratings WHERE task_id = ? AND subject_user = ? AND from_user = ?').get(taskId, task.company_id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Already rated this company.' });
  db.prepare(
    `INSERT INTO ratings (id, task_id, from_user, subject_user, subject_role, quality, communication, met_deadline, note, created_at)
     VALUES (?,?,?,?, 'company', ?,?,?,?,?)`
  ).run(id(), taskId, req.user.id, task.company_id, quality, communication, metDeadline, note, now());
  res.json({ ok: true });
});

export default router;
