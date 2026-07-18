import { Router } from 'express';
import db from '../db.js';
import { id, now, initials, isValidUrl } from '../util.js';
import { authRequired, requireRole } from '../auth.js';
import { serializeStudent } from '../serialize.js';
import { evidenceUpload } from '../upload.js';

const router = Router();

// Decide, from the evidence type + an optional uploaded file + optional URL,
// whether a skill is verified and what to store. A skill is verified ONLY when
// real proof is attached:
//   certificate -> requires an uploaded file
//   course      -> an uploaded file OR a valid public URL
//   anything else (self-taught) -> stays unverified until a StepIn task proves it
function resolveEvidence(evidenceType, file, evidenceUrl) {
  const out = { verified: false, type: evidenceType, url: '', file: '', note: '' };
  if (evidenceType === 'certificate' && file) {
    out.verified = true;
    out.file = file.filename;
    out.note = file.originalname;
  } else if (evidenceType === 'course') {
    if (file) {
      out.verified = true;
      out.file = file.filename;
      out.note = file.originalname;
    } else if (isValidUrl(evidenceUrl)) {
      out.verified = true;
      out.url = String(evidenceUrl).trim();
    }
  }
  return out;
}

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

// Add a skill. Accepts an optional uploaded proof file (multipart, field
// "evidence") or an "evidenceUrl". Verified only when real proof is attached;
// otherwise the skill is saved as unverified (no ranking boost) until proven.
router.post('/me/skills', authRequired, requireRole('student'), evidenceUpload, (req, res) => {
  const { name, evidenceType = 'none', evidenceUrl = '' } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Skill name is required' });
  const ev = resolveEvidence(evidenceType, req.file, evidenceUrl);
  db.prepare(
    `INSERT INTO skills (id, student_id, name, status, evidence_type, evidence_note, evidence_url, evidence_file, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    id(), req.user.id, name.trim(), ev.verified ? 'verified' : 'unverified',
    ev.type, ev.note, ev.url, ev.file, now()
  );
  res.json({ profile: serializeStudent(req.user.id, { full: true }) });
});

// Add evidence to an existing skill => flips to verified (requires real proof).
router.post('/me/skills/:skillId/evidence', authRequired, requireRole('student'), evidenceUpload, (req, res) => {
  const { evidenceType = 'certificate', evidenceUrl = '' } = req.body || {};
  const skill = db.prepare('SELECT * FROM skills WHERE id = ? AND student_id = ?').get(req.params.skillId, req.user.id);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  if (evidenceType === 'stepin_task') {
    return res.status(400).json({ error: 'StepIn-task verification is earned by completing a task, not added manually.' });
  }
  const ev = resolveEvidence(evidenceType, req.file, evidenceUrl);
  if (!ev.verified) {
    return res.status(400).json({
      error: evidenceType === 'certificate'
        ? 'Upload your certificate (PDF, JPG or PNG) to verify this skill.'
        : 'Upload a file or paste a valid course-completion link to verify this skill.',
    });
  }
  db.prepare(
    `UPDATE skills SET status = 'verified', evidence_type = ?, evidence_note = ?, evidence_url = ?, evidence_file = ? WHERE id = ?`
  ).run(ev.type, ev.note, ev.url, ev.file, skill.id);
  res.json({ profile: serializeStudent(req.user.id, { full: true }) });
});

router.delete('/me/skills/:skillId', authRequired, requireRole('student'), (req, res) => {
  db.prepare('DELETE FROM skills WHERE id = ? AND student_id = ?').run(req.params.skillId, req.user.id);
  res.json({ profile: serializeStudent(req.user.id, { full: true }) });
});

export default router;
