import db from './db.js';
import { id, now, parseJson } from './util.js';

/* ----------------------------------------------------------------------------
 * Notifications
 * ------------------------------------------------------------------------- */
export function notify(userId, { type, title, body = '', icon = 'ti-bell', link = null }) {
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, icon, link, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(id(), userId, type, title, body, icon, link, now());
}

/* ----------------------------------------------------------------------------
 * A student counts as a "newcomer" if they have completed 0 tasks. Reserved
 * newcomer slots guarantee day-one students a lane (docs §8.1 / §8.3).
 * ------------------------------------------------------------------------- */
export function isNewcomer(studentId) {
  const s = db.prepare('SELECT tasks_completed FROM students WHERE user_id = ?').get(studentId);
  return !s || s.tasks_completed === 0;
}

/* ----------------------------------------------------------------------------
 * Blind auto-scoring: score the auto-checkable items of a screening submission
 * against the template answer key. Returns a 0..1 fraction. The single
 * reasoning item is NOT scored here — it's reviewed by the company (§8.2).
 * ------------------------------------------------------------------------- */
export function autoScore(template, answers) {
  const questions = parseJson(template.questions, []);
  const auto = questions.filter((q) => q.type === 'mcq' || q.type === 'numeric');
  if (auto.length === 0) return 1;
  let correct = 0;
  for (const q of auto) {
    const given = answers?.[q.id];
    if (given == null) continue;
    if (q.type === 'mcq' && String(given) === String(q.answer)) correct++;
    if (q.type === 'numeric') {
      const gv = parseFloat(given);
      const key = parseFloat(q.answer);
      const tol = q.tolerance ?? 0;
      if (!Number.isNaN(gv) && Math.abs(gv - key) <= tol) correct++;
    }
  }
  return correct / auto.length;
}

/* ----------------------------------------------------------------------------
 * Build the shortlist for a task using the automatic slot rule (§8.3):
 *   merit slots  = highest rank_score regardless of history
 *   newcomer slots = best newcomers who cleared screening
 * Lifetime reputation is NOT the gate — only a tiebreaker / context.
 * Mutates applications: sets stage to 'shortlisted' or 'not_selected'.
 * ------------------------------------------------------------------------- */
export function buildShortlist(task) {
  const submitted = db
    .prepare(
      `SELECT * FROM applications
       WHERE task_id = ? AND stage = 'screening_submitted' AND rank_score IS NOT NULL`
    )
    .all(task.id);

  // rank by blind score, reputation only as tiebreaker
  const withRep = submitted.map((a) => {
    const s = db.prepare('SELECT reputation, tasks_completed FROM students WHERE user_id = ?').get(a.student_id);
    return { ...a, _rep: s?.reputation ?? 0, _newcomer: (s?.tasks_completed ?? 0) === 0 };
  });
  withRep.sort((a, b) => b.rank_score - a.rank_score || b._rep - a._rep);

  const meritSlots = task.merit_slots;
  const newcomerSlots = task.newcomer_slots;
  const chosen = new Set();

  // merit slots first — best overall
  const shortlist = [];
  for (const a of withRep) {
    if (shortlist.length >= meritSlots) break;
    shortlist.push({ app: a, newcomer: false });
    chosen.add(a.id);
  }
  // reserved newcomer slots — best newcomers not already chosen
  let filledNewcomer = 0;
  for (const a of withRep) {
    if (filledNewcomer >= newcomerSlots) break;
    if (chosen.has(a.id)) continue;
    if (a._newcomer) {
      shortlist.push({ app: a, newcomer: true });
      chosen.add(a.id);
      filledNewcomer++;
    }
  }

  const setShortlisted = db.prepare(
    `UPDATE applications SET stage = 'shortlisted', is_newcomer_slot = ? WHERE id = ?`
  );
  const setNot = db.prepare(`UPDATE applications SET stage = 'not_selected' WHERE id = ?`);

  for (const { app, newcomer } of shortlist) {
    setShortlisted.run(newcomer ? 1 : 0, app.id);
    notify(app.student_id, {
      type: 'shortlisted',
      title: 'You were shortlisted',
      body: `You're a finalist for "${task.title}". Do the full task before the deadline.`,
      icon: 'ti-star',
      link: `/student/workspace/${task.id}`,
    });
  }
  for (const a of withRep) {
    if (chosen.has(a.id)) continue;
    setNot.run(a.id);
    // Non-winner recognition: still earn reputation + a screening mark (§8.4)
    awardScreeningRecognition(a, task);
  }

  db.prepare(`UPDATE tasks SET status = 'finalists_working' WHERE id = ?`).run(task.id);
  return shortlist.length;
}

// Non-selected-but-completed-screening students get a small reputation bump +
// a "Strong screening" mark so effort is never fully wasted (§8.4 / §8.6).
function awardScreeningRecognition(app, task) {
  if (app.reputation_awarded) return;
  const bump = Math.round((app.rank_score ?? 0.5) * 40);
  db.prepare('UPDATE students SET reputation = reputation + ? WHERE user_id = ?').run(bump, app.student_id);
  db.prepare('UPDATE applications SET reputation_awarded = ?, badge_awarded = ? WHERE id = ?').run(
    bump,
    'Strong screening',
    app.id
  );
  notify(app.student_id, {
    type: 'result',
    title: 'Not selected this time',
    body: `You earned +${bump} reputation and a "Strong screening" mark on "${task.title}" — it counts toward your next application.`,
    icon: 'ti-award',
    link: '/student/applications',
  });
}

/* ----------------------------------------------------------------------------
 * Reputation + badges from a company's structured rating of a finalist (§8.6).
 * The platform auto-issues badges — the company only fills the structured
 * rating, never a written summary.
 * ------------------------------------------------------------------------- */
export function awardFromRating(app, task, rating, won) {
  const avg = ((rating.quality ?? 0) + (rating.communication ?? 0) + (rating.met_deadline ?? 0)) / 3; // 0..5
  const base = won ? 120 : 60;
  const rep = Math.round(base + avg * 20);

  db.prepare('UPDATE students SET reputation = reputation + ? WHERE user_id = ?').run(rep, app.student_id);
  if (won) {
    db.prepare('UPDATE students SET tasks_completed = tasks_completed + 1 WHERE user_id = ?').run(app.student_id);
  }
  db.prepare('UPDATE applications SET reputation_awarded = reputation_awarded + ? WHERE id = ?').run(rep, app.id);

  // Auto badges
  if (won && rating.quality >= 5) addBadge(app.student_id, 'Top submission', 'ti-award');
  if (rating.met_deadline >= 5) addBadge(app.student_id, 'Always on time', 'ti-clock-check');
  if (rating.communication >= 5) addBadge(app.student_id, 'Clear communicator', 'ti-messages');

  // Winner earns a verified StepIn-task skill for each task skill (§7 strongest evidence)
  if (won) {
    const skills = parseJson(task.skills, []);
    for (const name of skills) {
      const existing = db
        .prepare('SELECT id, status FROM skills WHERE student_id = ? AND lower(name) = lower(?)')
        .get(app.student_id, name);
      if (existing) {
        db.prepare(
          `UPDATE skills SET status = 'verified', evidence_type = 'stepin_task', evidence_note = ? WHERE id = ?`
        ).run(`StepIn task · ${task.title}`, existing.id);
      } else {
        db.prepare(
          `INSERT INTO skills (id, student_id, name, status, evidence_type, evidence_note, created_at)
           VALUES (?, ?, ?, 'verified', 'stepin_task', ?, ?)`
        ).run(id(), app.student_id, name, `StepIn task · ${task.title}`, now());
      }
    }
  }

  notify(app.student_id, {
    type: won ? 'won' : 'rated',
    title: won ? 'You won the task' : 'You were rated',
    body: `+${rep} reputation on "${task.title}".`,
    icon: won ? 'ti-trophy' : 'ti-star',
    link: '/student/applications',
  });
  return rep;
}

export function addBadge(studentId, label, icon) {
  const existing = db.prepare('SELECT id, count FROM badges WHERE student_id = ? AND label = ?').get(studentId, label);
  if (existing) {
    db.prepare('UPDATE badges SET count = count + 1 WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO badges (id, student_id, label, icon, count, created_at) VALUES (?,?,?,?,1,?)').run(
      id(),
      studentId,
      label,
      icon,
      now()
    );
  }
}

/* ----------------------------------------------------------------------------
 * Company probation (§9/§10): a company is promoted to "trusted" once it has
 * engaged — selected a winner and met the decision deadline at least once.
 * Repeatedly missing decision deadlines or never selecting is the harvest
 * signal → flagged.
 * ------------------------------------------------------------------------- */
export function reviewCompanyStanding(companyId) {
  const tasks = db.prepare('SELECT * FROM tasks WHERE company_id = ?').all(companyId);
  const decided = tasks.filter((t) => t.status === 'decided');
  const missed = db
    .prepare(`SELECT COUNT(*) c FROM incidents WHERE subject_user = ? AND type = 'decision_missed'`)
    .get(companyId).c;
  const selections = db
    .prepare(
      `SELECT COUNT(*) c FROM applications a JOIN tasks t ON a.task_id = t.id
       WHERE t.company_id = ? AND a.stage = 'won'`
    )
    .get(companyId).c;

  const company = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(companyId);
  if (!company) return;

  let status = company.status;
  if (selections >= 1 && missed === 0) status = 'trusted';
  if (missed >= 2 || (tasks.length >= 5 && selections === 0)) status = 'flagged';

  const cap = status === 'trusted' ? 8 : status === 'flagged' ? 1 : 3;
  db.prepare('UPDATE companies SET status = ?, concurrent_cap = ? WHERE user_id = ?').run(status, cap, companyId);
  return { status, cap, decided: decided.length, selections, missed };
}

/* ----------------------------------------------------------------------------
 * Deadline sweep: advance clocks for every live task. Called on server start
 * and periodically. Handles apply->screening close, shortlist build on
 * screening deadline, no-show promotion, and missed company decisions.
 * ------------------------------------------------------------------------- */
export function sweepDeadlines() {
  const nowMs = Date.now();
  const tasks = db.prepare(`SELECT * FROM tasks WHERE status IN ('live','screening','finalists_working')`).all();

  for (const task of tasks) {
    // Screening deadline reached & shortlist not yet built -> build it
    if (
      new Date(task.screening_deadline).getTime() <= nowMs &&
      (task.status === 'live' || task.status === 'screening')
    ) {
      buildShortlist(task);
      continue;
    }

    // Task deadline reached -> finalists who didn't submit are no-shows,
    // promote a backup from the shortlist pool if available.
    if (task.status === 'finalists_working' && new Date(task.task_deadline).getTime() <= nowMs) {
      const finalists = db
        .prepare(`SELECT * FROM applications WHERE task_id = ? AND stage IN ('shortlisted','doing_task')`)
        .all(task.id);
      for (const f of finalists) {
        if (!f.submitted_at) {
          db.prepare(`UPDATE applications SET stage = 'no_show' WHERE id = ?`).run(f.id);
          logIncident('no_show', task.id, f.student_id, `Missed task deadline on "${task.title}"`);
        }
      }
    }
  }

  // Missed company decision deadline -> probation signal, free students
  const awaiting = db.prepare(`SELECT * FROM tasks WHERE status = 'finalists_working'`).all();
  for (const task of awaiting) {
    if (new Date(task.decision_deadline).getTime() <= nowMs) {
      const already = db
        .prepare(`SELECT COUNT(*) c FROM incidents WHERE task_id = ? AND type = 'decision_missed'`)
        .get(task.id).c;
      if (!already) {
        logIncident('decision_missed', task.id, task.company_id, `No decision by deadline on "${task.title}"`);
        db.prepare(`UPDATE tasks SET status = 'closed' WHERE id = ?`).run(task.id);
        // free the finalists
        db.prepare(
          `UPDATE applications SET stage = 'lost' WHERE task_id = ? AND stage IN ('shortlisted','doing_task','awaiting_decision','live_defense')`
        ).run(task.id);
        notify(task.company_id, {
          type: 'probation',
          title: 'Decision deadline missed',
          body: `You didn't decide on "${task.title}" in time. Finalists are freed and this counts against your standing.`,
          icon: 'ti-alert-triangle',
        });
        reviewCompanyStanding(task.company_id);
      }
    }
  }
}

export function logIncident(type, taskId, subjectUser, detail) {
  db.prepare(
    `INSERT INTO incidents (id, type, task_id, subject_user, detail, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?)`
  ).run(id(), type, taskId, subjectUser, detail, now());
}
