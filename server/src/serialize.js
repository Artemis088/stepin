import db from './db.js';
import { parseJson, timeLeft } from './util.js';

export function taskCounts(taskId) {
  const rows = db.prepare('SELECT stage FROM applications WHERE task_id = ?').all(taskId);
  const applied = rows.length;
  const screened = rows.filter((r) =>
    ['screening_submitted', 'shortlisted', 'not_selected', 'doing_task', 'live_defense', 'awaiting_decision', 'won', 'lost', 'no_show'].includes(
      r.stage
    )
  ).length;
  const shortlisted = rows.filter((r) =>
    ['shortlisted', 'doing_task', 'live_defense', 'awaiting_decision', 'won', 'lost'].includes(r.stage)
  ).length;
  return { applied, screened, shortlisted };
}

export function companyBrief(companyId) {
  const c = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(companyId);
  if (!c) return null;
  const ratings = db
    .prepare(`SELECT quality, communication, met_deadline FROM ratings WHERE subject_user = ? AND subject_role = 'company'`)
    .all(companyId);
  const rating = avgRating(ratings);
  return {
    id: companyId,
    name: c.name,
    initials: c.initials,
    verified: !!c.verified,
    status: c.status,
    rating,
  };
}

export function avgRating(rows) {
  if (!rows.length) return null;
  const dims = ['quality', 'communication', 'met_deadline'];
  let sum = 0;
  let n = 0;
  for (const r of rows)
    for (const d of dims)
      if (r[d] != null) {
        sum += r[d];
        n++;
      }
  return n ? Math.round((sum / n) * 10) / 10 : null;
}

export function serializeTask(task, viewerId = null) {
  const counts = taskCounts(task.id);
  let myApp = null;
  if (viewerId) {
    myApp = db.prepare('SELECT * FROM applications WHERE task_id = ? AND student_id = ?').get(task.id, viewerId);
  }
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    doneLooksLike: task.done_looks_like,
    vertical: task.vertical,
    skills: parseJson(task.skills, []),
    motive: task.motive,
    sampleData: !!task.sample_data_confirmed,
    compensationType: task.compensation_type,
    stipendAmount: task.stipend_amount,
    appliedCap: task.applied_cap,
    screeningCap: task.screening_cap,
    newcomerSlots: task.newcomer_slots,
    meritSlots: task.merit_slots,
    templateId: task.template_id,
    isInternship: !!task.is_internship,
    status: task.status,
    deadlines: {
      apply: task.apply_deadline,
      screening: task.screening_deadline,
      task: task.task_deadline,
      decision: task.decision_deadline,
    },
    countdowns: {
      apply: timeLeft(task.apply_deadline),
      screening: timeLeft(task.screening_deadline),
      task: timeLeft(task.task_deadline),
      decision: timeLeft(task.decision_deadline),
    },
    counts,
    company: companyBrief(task.company_id),
    createdAt: task.created_at,
    myStage: myApp?.stage || null,
    myApplicationId: myApp?.id || null,
  };
}

export function serializeStudent(userId, { full = false } = {}) {
  const s = db.prepare('SELECT * FROM students WHERE user_id = ?').get(userId);
  if (!s) return null;
  const skills = db.prepare('SELECT * FROM skills WHERE student_id = ? ORDER BY status DESC, created_at').all(userId);
  const badges = db.prepare('SELECT * FROM badges WHERE student_id = ? ORDER BY created_at').all(userId);
  const portfolio = db.prepare('SELECT * FROM portfolio WHERE student_id = ? ORDER BY created_at DESC').all(userId);
  const ratingRows = db
    .prepare(`SELECT * FROM ratings WHERE subject_user = ? AND subject_role = 'student' ORDER BY created_at DESC`)
    .all(userId);
  const rating = avgRating(ratingRows);
  return {
    id: userId,
    name: s.name,
    initials: s.photo_initials,
    vertical: s.vertical,
    bio: s.bio,
    about: s.about,
    reputation: s.reputation,
    tasksCompleted: s.tasks_completed,
    onboarded: !!s.onboarded,
    rating,
    ratingsCount: ratingRows.length,
    skills: skills.map((k) => ({
      id: k.id,
      name: k.name,
      status: k.status,
      evidenceType: k.evidence_type,
      evidenceNote: k.evidence_note,
      evidenceUrl: k.evidence_url || '',
      evidenceFile: k.evidence_file || '',
    })),
    badges: badges.map((b) => ({ id: b.id, label: b.label, icon: b.icon, count: b.count })),
    portfolio: portfolio.map((p) => ({
      id: p.id,
      title: p.title,
      companyName: p.company_name,
      confidential: !!p.confidential,
      role: p.role,
    })),
    // structured ratings are hidden until a few exist (§8.6 early-review protection)
    ratings:
      full && ratingRows.length >= 3
        ? ratingRows.map((r) => ({
            quality: r.quality,
            communication: r.communication,
            metDeadline: r.met_deadline,
            note: r.note,
            createdAt: r.created_at,
          }))
        : [],
    ratingsProtected: ratingRows.length < 3,
  };
}
