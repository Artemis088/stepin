import bcrypt from 'bcryptjs';
import db from './db.js';
import { id, now, daysFromNow, initials } from './util.js';

// Deterministic-ish demo data that mirrors the design mockups. All demo
// passwords are "password".
const PW = () => bcrypt.hashSync('password', 10);

function mkUser(role, email) {
  const uid = id();
  db.prepare('INSERT INTO users (id, role, email, password_hash, created_at) VALUES (?,?,?,?,?)').run(uid, role, email, PW(), now());
  return uid;
}

function mkStudent(email, name, vertical, bio, about, reputation, tasksCompleted) {
  const uid = mkUser('student', email);
  db.prepare(
    `INSERT INTO students (user_id, name, photo_initials, vertical, bio, about, reputation, tasks_completed, onboarded)
     VALUES (?,?,?,?,?,?,?,?,1)`
  ).run(uid, name, initials(name), vertical, bio, about, reputation, tasksCompleted);
  return uid;
}

function mkCompany(email, name, reg, website, contactName, contactEmail, status, cap) {
  const uid = mkUser('company', email);
  db.prepare(
    `INSERT INTO companies (user_id, name, initials, registration_id, website, contact_name, contact_email, agreement_signed, status, concurrent_cap, verified, onboarded)
     VALUES (?,?,?,?,?,?,?,1,?,?,1,1)`
  ).run(uid, name, initials(name), reg, website, contactName, contactEmail, status, cap);
  return uid;
}

function addSkill(studentId, name, status, evType, evNote) {
  db.prepare(
    `INSERT INTO skills (id, student_id, name, status, evidence_type, evidence_note, created_at) VALUES (?,?,?,?,?,?,?)`
  ).run(id(), studentId, name, status, evType, evNote, now());
}

function addBadge(studentId, label, icon, count) {
  db.prepare('INSERT INTO badges (id, student_id, label, icon, count, created_at) VALUES (?,?,?,?,?,?)').run(id(), studentId, label, icon, count, now());
}

function addPortfolio(studentId, title, company, confidential, role) {
  db.prepare(
    'INSERT INTO portfolio (id, student_id, title, company_name, confidential, role, created_at) VALUES (?,?,?,?,?,?,?)'
  ).run(id(), studentId, title, company, confidential ? 1 : 0, role, now());
}

const DATA_TEMPLATE = [
  {
    id: 'q1',
    type: 'mcq',
    prompt: 'A table has one row per purchase. To count distinct customers who bought in March, which is correct?',
    options: [
      'COUNT(DISTINCT customer_id) with a March filter',
      'COUNT(customer_id) with a March filter',
      'SUM(customer_id) with a March filter',
    ],
    answer: 'COUNT(DISTINCT customer_id) with a March filter',
  },
  {
    id: 'q2',
    type: 'numeric',
    prompt: 'Given this sample, roughly what share of customers churned last quarter? Enter a whole number.',
    unit: '%',
    answer: 18,
    tolerance: 3,
  },
  {
    id: 'q3',
    type: 'reasoning',
    prompt: 'In 3–4 sentences: what would you look at first to explain the churn, and why?',
    maxChars: 400,
  },
];

const SOFTWARE_TEMPLATE = [
  {
    id: 'q1',
    type: 'mcq',
    prompt: 'Which time complexity best describes a binary search over a sorted array of n items?',
    options: ['O(log n)', 'O(n)', 'O(n log n)'],
    answer: 'O(log n)',
  },
  {
    id: 'q2',
    type: 'mcq',
    prompt: 'A function mutates its input array and also returns it. What is the main risk?',
    options: ['Unexpected side effects for the caller', 'Slower execution', 'Higher memory only'],
    answer: 'Unexpected side effects for the caller',
  },
  {
    id: 'q3',
    type: 'reasoning',
    prompt: 'In 3–4 sentences: how would you approach breaking this feature into small, testable pieces?',
    maxChars: 400,
  },
];

const DESIGN_TEMPLATE = [
  {
    id: 'q1',
    type: 'mcq',
    prompt: 'A primary call-to-action is competing with three equally-bold buttons. Best first fix?',
    options: ['Establish one clear visual hierarchy', 'Make everything larger', 'Add more color'],
    answer: 'Establish one clear visual hierarchy',
  },
  {
    id: 'q2',
    type: 'reasoning',
    prompt: 'In 3–4 sentences: walk through how you would redesign this screen and what trade-offs you would weigh.',
    maxChars: 400,
  },
];

export function ensureSeed() {
  const already = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (already > 0) return;
  console.log('Seeding StepIn demo data…');

  // Templates
  const dataTpl = id();
  const swTpl = id();
  const designTpl = id();
  db.prepare('INSERT INTO templates (id, vertical, name, est_minutes, questions, created_at) VALUES (?,?,?,?,?,?)').run(
    dataTpl,
    'data',
    'Data screening template',
    30,
    JSON.stringify(DATA_TEMPLATE),
    now()
  );
  db.prepare('INSERT INTO templates (id, vertical, name, est_minutes, questions, created_at) VALUES (?,?,?,?,?,?)').run(
    swTpl,
    'software',
    'Software screening template',
    30,
    JSON.stringify(SOFTWARE_TEMPLATE),
    now()
  );
  db.prepare('INSERT INTO templates (id, vertical, name, est_minutes, questions, created_at) VALUES (?,?,?,?,?,?)').run(
    designTpl,
    'design',
    'Design screening template',
    25,
    JSON.stringify(DESIGN_TEMPLATE),
    now()
  );

  // Admin
  mkUser('admin', 'admin@stepin.ge');

  // Students
  const nino = mkStudent(
    'nino@student.ge',
    'Nino Kapanadze',
    'data',
    '3rd-year student · exploring analytics and reporting',
    'I like turning messy data into clear reports. Looking for short real tasks in analytics to build a track record before graduating.',
    742,
    7
  );
  addSkill(nino, 'SQL', 'verified', 'stepin_task', 'StepIn task');
  addSkill(nino, 'Power BI', 'verified', 'certificate', 'Microsoft cert');
  addSkill(nino, 'Python', 'unverified', 'none', '');
  addBadge(nino, 'Top submission', 'ti-award', 3);
  addBadge(nino, 'Always on time', 'ti-clock-check', 1);
  addBadge(nino, 'Fast starter', 'ti-rocket', 1);
  addPortfolio(nino, 'Sales dashboard', 'TBC Retail', false, 'analyst');
  addPortfolio(nino, 'Churn analysis', null, true, 'analyst');

  const luka = mkStudent('luka@student.ge', 'Luka Tsereteli', 'data', '1st-year · just getting started', 'New to analytics, eager to learn by doing.', 0, 0);
  addSkill(luka, 'SQL', 'unverified', 'none', '');
  addSkill(luka, 'Excel', 'verified', 'course', 'Coursera course');

  const mari = mkStudent('mari@student.ge', 'Mari Gelashvili', 'data', '2nd-year · analytics', 'Interested in reporting and dashboards.', 310, 3);
  addSkill(mari, 'SQL', 'verified', 'stepin_task', 'StepIn task');
  addSkill(mari, 'Reporting', 'verified', 'stepin_task', 'StepIn task');
  addBadge(mari, 'Top submission', 'ti-award', 1);

  const giorgi = mkStudent('giorgi@student.ge', 'Giorgi Beridze', 'software', '3rd-year · backend', 'Building small services and CLIs.', 180, 2);
  addSkill(giorgi, 'JavaScript', 'verified', 'stepin_task', 'StepIn task');
  addSkill(giorgi, 'Node.js', 'unverified', 'none', '');

  // Companies
  const tbc = mkCompany('careers@tbcbank.com.ge', 'TBC Retail', 'GE-204512', 'tbcbank.ge', 'Data Lead', 'careers@tbcbank.com.ge', 'trusted', 8);
  const bog = mkCompany('talent@bog.ge', 'Bank of Georgia', 'GE-198233', 'bankofgeorgia.ge', 'People Ops', 'talent@bog.ge', 'trusted', 8);
  const silknet = mkCompany('hr@silknet.com', 'Silknet', 'GE-771020', 'silknet.com', 'Eng Manager', 'hr@silknet.com', 'probation', 3);

  // --- Task 1: Customer churn report (TBC) — screening in progress ---------
  const t1 = id();
  db.prepare(
    `INSERT INTO tasks (id, company_id, title, description, done_looks_like, vertical, skills, motive, sample_data_confirmed,
      compensation_type, stipend_amount, applied_cap, screening_cap, newcomer_slots, merit_slots, template_id, status,
      apply_deadline, screening_deadline, task_deadline, decision_deadline, sensitivity_ok, created_at)
     VALUES (?,?,?,?,?,?,?,?,1,'credential',0,20,10,2,3,?, 'screening', ?, ?, ?, ?, 1, ?)`
  ).run(
    t1,
    tbc,
    'Customer churn report',
    'Analyse a provided sample dataset of about 2,000 fictional customers and produce a short report identifying likely churn drivers. No real customer data is involved.',
    'A 1–2 page report with three findings and one chart.',
    'data',
    JSON.stringify(['SQL', 'Reporting']),
    'needs_now',
    dataTpl,
    daysFromNow(3),
    daysFromNow(5),
    daysFromNow(10),
    daysFromNow(13),
    now()
  );
  // Nino has applied and is mid-screening (interested)
  db.prepare(`INSERT INTO applications (id, task_id, student_id, stage, applied_at) VALUES (?,?,?, 'interested', ?)`).run(id(), t1, nino, now());
  // some other applicants already completed screening to fill the counter (6/10)
  for (let i = 0; i < 5; i++) {
    const stu = mkStudent(`applicant${i}@student.ge`, `Applicant ${i + 1}`, 'data', 'student', '', 100 + i * 10, i % 2);
    addSkill(stu, 'SQL', i % 2 ? 'verified' : 'unverified', i % 2 ? 'stepin_task' : 'none', i % 2 ? 'StepIn task' : '');
    db.prepare(
      `INSERT INTO applications (id, task_id, student_id, stage, screening_answers, screening_auto_score, rank_score, screening_submitted_at, applied_at)
       VALUES (?,?,?, 'screening_submitted', ?, ?, ?, ?, ?)`
    ).run(id(), t1, stu, JSON.stringify({ q1: DATA_TEMPLATE[0].answer, q2: 18 }), 0.9 - i * 0.1, 0.9 - i * 0.1, now(), now());
  }

  // --- Task 2: Marketing dashboard prototype (BoG) — finalists working -----
  const t2 = id();
  db.prepare(
    `INSERT INTO tasks (id, company_id, title, description, done_looks_like, vertical, skills, motive, sample_data_confirmed,
      compensation_type, stipend_amount, applied_cap, screening_cap, newcomer_slots, merit_slots, template_id, status,
      apply_deadline, screening_deadline, task_deadline, decision_deadline, sensitivity_ok, created_at)
     VALUES (?,?,?,?,?,?,?,?,1,'stipend',300,20,10,2,3,?, 'finalists_working', ?, ?, ?, ?, 1, ?)`
  ).run(
    t2,
    bog,
    'Marketing dashboard prototype',
    'Build a clickable dashboard prototype from a provided sample marketing dataset. Synthetic data only.',
    'A prototype with 3 key charts and a short walkthrough.',
    'data',
    JSON.stringify(['Power BI', 'Reporting']),
    'scouting',
    dataTpl,
    daysFromNow(-2),
    daysFromNow(-1),
    daysFromNow(5),
    daysFromNow(8),
    now()
  );
  // Nino is a shortlisted finalist doing the task
  db.prepare(
    `INSERT INTO applications (id, task_id, student_id, stage, screening_auto_score, rank_score, screening_submitted_at, terms_accepted, applied_at)
     VALUES (?,?,?, 'doing_task', 0.95, 0.95, ?, 1, ?)`
  ).run(id(), t2, nino, now(), now());
  // Mari also a finalist, already submitted
  db.prepare(
    `INSERT INTO applications (id, task_id, student_id, stage, screening_auto_score, rank_score, screening_submitted_at, terms_accepted, deliverable_name, deliverable_summary, submitted_at, applied_at)
     VALUES (?,?,?, 'live_defense', 0.85, 0.85, ?, 1, 'dashboard.pdf', '3 charts · walkthrough', ?, ?)`
  ).run(id(), t2, mari, now(), now(), now());
  // Luka newcomer finalist
  db.prepare(
    `INSERT INTO applications (id, task_id, student_id, stage, is_newcomer_slot, screening_auto_score, rank_score, screening_submitted_at, terms_accepted, applied_at)
     VALUES (?,?,?, 'shortlisted', 1, 0.7, 0.7, ?, 0, ?)`
  ).run(id(), t2, luka, now(), now());

  // --- Task 3: Data cleanup script (Silknet) — decided, Nino not selected --
  const t3 = id();
  db.prepare(
    `INSERT INTO tasks (id, company_id, title, description, done_looks_like, vertical, skills, motive, sample_data_confirmed,
      compensation_type, stipend_amount, applied_cap, screening_cap, newcomer_slots, merit_slots, template_id, status,
      apply_deadline, screening_deadline, task_deadline, decision_deadline, sensitivity_ok, created_at)
     VALUES (?,?,?,?,?,?,?,?,1,'credential',0,20,10,2,3,?, 'decided', ?, ?, ?, ?, 1, ?)`
  ).run(
    t3,
    silknet,
    'Data cleanup script',
    'Write a small script to clean a messy sample CSV. Synthetic data only.',
    'A script plus a short note on assumptions.',
    'software',
    JSON.stringify(['Python']),
    'needs_now',
    swTpl,
    daysFromNow(-10),
    daysFromNow(-8),
    daysFromNow(-4),
    daysFromNow(-1),
    now()
  );
  db.prepare(
    `INSERT INTO applications (id, task_id, student_id, stage, screening_auto_score, rank_score, screening_submitted_at, reputation_awarded, badge_awarded, applied_at)
     VALUES (?,?,?, 'not_selected', 0.75, 0.75, ?, 40, 'Strong screening', ?)`
  ).run(id(), t3, nino, now(), now());

  // --- Task 4: a live task open for applications (Software / TBC) ----------
  const t4 = id();
  db.prepare(
    `INSERT INTO tasks (id, company_id, title, description, done_looks_like, vertical, skills, motive, sample_data_confirmed,
      compensation_type, stipend_amount, applied_cap, screening_cap, newcomer_slots, merit_slots, template_id, status,
      apply_deadline, screening_deadline, task_deadline, decision_deadline, sensitivity_ok, created_at)
     VALUES (?,?,?,?,?,?,?,?,1,'stipend',150,20,10,2,3,?, 'live', ?, ?, ?, ?, 1, ?)`
  ).run(
    t4,
    tbc,
    'Sales data API endpoint',
    'Implement a small REST endpoint that returns aggregated sales figures from a provided sample database. Synthetic data only.',
    'A working endpoint with a short README.',
    'software',
    JSON.stringify(['JavaScript', 'Node.js']),
    'scouting',
    swTpl,
    daysFromNow(4),
    daysFromNow(7),
    daysFromNow(12),
    daysFromNow(15),
    now()
  );

  // Flag the internship postings among the seeded tasks (t1 screening, t2 finalists).
  db.prepare('UPDATE tasks SET is_internship = 1 WHERE id IN (?, ?)').run(t1, t2);

  // A few more live postings so both the Internships and Tasks tabs have content.
  const mkLive = (company, isInternship, title, description, done, vertical, skills, motive, comp, stipend, tpl) => {
    db.prepare(
      `INSERT INTO tasks (id, company_id, title, description, done_looks_like, vertical, skills, motive, sample_data_confirmed,
        compensation_type, stipend_amount, applied_cap, screening_cap, newcomer_slots, merit_slots, template_id, is_internship, status,
        apply_deadline, screening_deadline, task_deadline, decision_deadline, sensitivity_ok, created_at)
       VALUES (?,?,?,?,?,?,?,?,1,?,?,20,10,2,3,?,?, 'live', ?, ?, ?, ?, 1, ?)`
    ).run(
      id(), company, title, description, done, vertical, JSON.stringify(skills), motive,
      comp, comp === 'stipend' ? stipend : 0, tpl, isInternship ? 1 : 0,
      daysFromNow(4), daysFromNow(7), daysFromNow(12), daysFromNow(15), now()
    );
  };

  // Internship postings (headline product — winner is hired).
  mkLive(bog, 1, 'Junior Data Analyst internship',
    'Trial task: analyse a provided sample sales dataset and summarise three insights. The strongest finalist is hired into a paid junior analyst internship. Synthetic data only.',
    'A short insights deck built from the sample data.', 'data', ['SQL', 'Excel'], 'scouting', 'stipend', 400, dataTpl);
  mkLive(silknet, 1, 'Frontend Engineer internship',
    'Trial task: build a small responsive component from a provided spec. The best finalist joins the team as a frontend intern.',
    'A working component with a short note on your approach.', 'software', ['JavaScript', 'React'], 'scouting', 'credential', 0, swTpl);

  // Standalone one-off task (no guaranteed internship).
  mkLive(tbc, 0, 'Logo concept exploration',
    'One-off task: propose three logo directions for a fictional sample brand. Synthetic brief only — a company that likes your work may reach out later.',
    'Three concepts with a one-line rationale each.', 'design', ['Figma'], 'needs_now', 'stipend', 120, designTpl);

  // A couple of notifications for Nino
  db.prepare('INSERT INTO notifications (id, user_id, type, title, body, icon, link, read, created_at) VALUES (?,?,?,?,?,?,?,0,?)').run(
    id(),
    nino,
    'deadline',
    'Screening due soon',
    'Your screening for "Customer churn report" is due in 5 days.',
    'ti-hourglass',
    `/student/screening/${t1}`,
    now()
  );
  db.prepare('INSERT INTO notifications (id, user_id, type, title, body, icon, link, read, created_at) VALUES (?,?,?,?,?,?,?,1,?)').run(
    id(),
    nino,
    'result',
    'Not selected this time',
    'You earned +40 reputation and a "Strong screening" mark on "Data cleanup script".',
    'ti-award',
    '/student/applications',
    now()
  );

  console.log('Seed complete. Demo logins (password: "password"):');
  console.log('  student : nino@student.ge');
  console.log('  company : careers@tbcbank.com.ge');
  console.log('  admin   : admin@stepin.ge');
}

// Allow `npm run seed` to force reseed
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  db.exec(
    'DELETE FROM notifications; DELETE FROM incidents; DELETE FROM agreements; DELETE FROM ratings; DELETE FROM badges; DELETE FROM portfolio; DELETE FROM skills; DELETE FROM applications; DELETE FROM tasks; DELETE FROM templates; DELETE FROM students; DELETE FROM companies; DELETE FROM users;'
  );
  ensureSeed();
  console.log('Reseeded.');
}
