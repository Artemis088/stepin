import { Router } from 'express';
import db from '../db.js';
import { id, now, initials } from '../util.js';
import { authRequired, requireRole } from '../auth.js';
import { serializeStudent } from '../serialize.js';

const router = Router();

// Public-ish: view any student profile (used by companies at final pick)
router.get('/:id', authRequired, (req, res) => {
  const profile = serializeStudent(req.params.id, { full: true });
  if (!profile) return res.status(404).json({ error: 'Student not found' });
  res.json({ profile });
});

// Update own profile
router.patch('/me', authRequired, requireRole('student'), (req, res) => {
  const { name, bio, about, vertical } = req.body || {};
  const s = db.prepare('SELECT * FROM students WHERE user_id = ?').get(req.user.id);
  db.prepare(
    `UPDATE students SET name = ?, bio = ?, about = ?, vertical = ?, photo_initials = ? WHERE user_id = ?`
  ).run(
    name ?? s.name,
    bio ?? s.bio,
    about ?? s.about,
    vertical ?? s.vertical,
    name ? initials(name) : s.photo_initials,
    req.user.id
  );
  res.json({ profile: serializeStudent(req.user.id, { full: true }) });
});

// Add a skill — lands as unverified unless evidence provided (§7)
router.post('/me/skills', authRequired, requireRole('student'), (req, res) => {
  const { name, evidenceType = 'none', evidenceNote = '' } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Skill name is required' });
  // certificate / course evidence => verified; "earn by task" stays unverified
  const verified = evidenceType === 'certificate' || evidenceType === 'course';
  db.prepare(
    `INSERT INTO skills (id, student_id, name, status, evidence_type, evidence_note, created_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(id(), req.user.id, name.trim(), verified ? 'verified' : 'unverified', evidenceType, evidenceNote, now());
  res.json({ profile: serializeStudent(req.user.id, { full: true }) });
});

// Add evidence to an existing skill => flips to verified
router.post('/me/skills/:skillId/evidence', authRequired, requireRole('student'), (req, res) => {
  const { evidenceType = 'certificate', evidenceNote = '' } = req.body || {};
  const skill = db.prepare('SELECT * FROM skills WHERE id = ? AND student_id = ?').get(req.params.skillId, req.user.id);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  if (evidenceType === 'stepin_task') {
    return res.status(400).json({ error: 'StepIn-task verification is earned by completing a task, not added manually.' });
  }
  db.prepare(`UPDATE skills SET status = 'verified', evidence_type = ?, evidence_note = ? WHERE id = ?`).run(
    evidenceType,
    evidenceNote,
    skill.id
  );
  res.json({ profile: serializeStudent(req.user.id, { full: true }) });
});

router.delete('/me/skills/:skillId', authRequired, requireRole('student'), (req, res) => {
  db.prepare('DELETE FROM skills WHERE id = ? AND student_id = ?').run(req.params.skillId, req.user.id);
  res.json({ profile: serializeStudent(req.user.id, { full: true }) });
});

export default router;
