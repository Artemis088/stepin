import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// STEPIN_DB_PATH lets a hosted deploy point the database at a persistent disk
// (e.g. Render disk mount at /var/data/stepin.db). Defaults to the local file.
const DB_PATH = process.env.STEPIN_DB_PATH || path.join(__dirname, '..', 'stepin.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/*
 * StepIn schema — models the full lifecycle described in the system documentation:
 *  - users split into student / company / admin roles
 *  - the four deadlines + two caps live on the task
 *  - applications carry a funnel stage: interested -> screening_submitted ->
 *    shortlisted / not_selected -> doing_task -> live_defense -> decided -> result
 *  - blind screening (auto-checked items + one company-reviewed reasoning item)
 *  - shortlist built from merit slots + reserved newcomer slots
 *  - reputation, structured ratings, badges, probation, IP assignment
 */

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('student','company','admin')),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Student-specific profile (profile, not resume)
CREATE TABLE IF NOT EXISTS students (
  user_id        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  photo_initials TEXT,
  vertical       TEXT NOT NULL,           -- software / design / data
  bio            TEXT DEFAULT '',
  about          TEXT DEFAULT '',
  reputation     INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  onboarded      INTEGER NOT NULL DEFAULT 0
);

-- Verified skill profile. status: verified | unverified.
-- evidence_type: certificate | course | stepin_task | none
CREATE TABLE IF NOT EXISTS skills (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('verified','unverified')),
  evidence_type TEXT NOT NULL DEFAULT 'none',
  evidence_note TEXT DEFAULT '',
  evidence_url  TEXT DEFAULT '',            -- verifiable public link (course completion, etc.)
  evidence_file TEXT DEFAULT '',            -- uploaded proof filename (served from /uploads)
  created_at    TEXT NOT NULL
);

-- Portfolio pieces (incl. work whose ownership transferred, via carve-out)
CREATE TABLE IF NOT EXISTS portfolio (
  id           TEXT PRIMARY KEY,
  student_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  company_name TEXT,
  confidential INTEGER NOT NULL DEFAULT 0,
  role         TEXT DEFAULT '',
  task_id      TEXT,                        -- set => StepIn-completed work (verified)
  origin       TEXT NOT NULL DEFAULT 'stepin', -- 'stepin' (verified) | 'self' (student-added)
  description  TEXT DEFAULT '',
  link         TEXT DEFAULT '',             -- external project link (self-added)
  file         TEXT DEFAULT '',             -- uploaded proof filename (served from /uploads)
  created_at   TEXT NOT NULL
);

-- Company-specific profile + vetting/probation
CREATE TABLE IF NOT EXISTS companies (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  initials         TEXT,
  registration_id  TEXT,                  -- legal registration / tax ID
  website          TEXT,
  contact_name     TEXT,
  contact_email    TEXT,                  -- company-domain email
  agreement_signed INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'probation' CHECK (status IN ('probation','trusted','flagged')),
  concurrent_cap   INTEGER NOT NULL DEFAULT 3,
  verified         INTEGER NOT NULL DEFAULT 0,
  onboarded        INTEGER NOT NULL DEFAULT 0
);

-- Tasks: scoped, non-sensitive, four deadlines, two caps, motive, currency
CREATE TABLE IF NOT EXISTS tasks (
  id                 TEXT PRIMARY KEY,
  company_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT NOT NULL,
  done_looks_like    TEXT NOT NULL,
  vertical           TEXT NOT NULL,
  skills             TEXT NOT NULL DEFAULT '[]',   -- JSON array of skill names
  motive             TEXT NOT NULL CHECK (motive IN ('needs_now','scouting')),
  sample_data_confirmed INTEGER NOT NULL DEFAULT 0,
  compensation_type  TEXT NOT NULL DEFAULT 'credential' CHECK (compensation_type IN ('credential','stipend')),
  stipend_amount     INTEGER DEFAULT 0,
  applied_cap        INTEGER NOT NULL DEFAULT 20,
  screening_cap      INTEGER NOT NULL DEFAULT 10,
  newcomer_slots     INTEGER NOT NULL DEFAULT 2,
  merit_slots        INTEGER NOT NULL DEFAULT 3,
  template_id        TEXT,
  -- The one flag that distinguishes the two product surfaces:
  -- 1 = internship posting (winner is hired into the internship),
  -- 0 = standalone one-off task (no guaranteed outcome). Same task engine either way.
  is_internship      INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','live','screening','shortlist_ready','finalists_working','decided','closed','blocked')),
  -- the four clocks (ISO strings)
  apply_deadline     TEXT NOT NULL,
  screening_deadline TEXT NOT NULL,
  task_deadline      TEXT NOT NULL,
  decision_deadline  TEXT NOT NULL,
  sensitivity_ok     INTEGER NOT NULL DEFAULT 1,    -- admin moderation flag
  created_at         TEXT NOT NULL
);

-- Screening templates per task type (platform-provided in MVP)
CREATE TABLE IF NOT EXISTS templates (
  id         TEXT PRIMARY KEY,
  vertical   TEXT NOT NULL,
  name       TEXT NOT NULL,
  est_minutes INTEGER NOT NULL DEFAULT 30,
  questions  TEXT NOT NULL DEFAULT '[]',   -- JSON: [{id,type,prompt,options?,answer?,maxChars?}]
  created_at TEXT NOT NULL
);

-- Applications: one per (student, task). Carries the funnel stage.
CREATE TABLE IF NOT EXISTS applications (
  id             TEXT PRIMARY KEY,
  task_id        TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage          TEXT NOT NULL DEFAULT 'interested'
                   CHECK (stage IN ('interested','screening_submitted','shortlisted','not_selected',
                                    'doing_task','live_defense','awaiting_decision','won','lost','no_show')),
  is_newcomer_slot INTEGER NOT NULL DEFAULT 0,
  applied_at     TEXT NOT NULL,
  -- screening
  screening_answers TEXT,                  -- JSON map questionId -> answer
  screening_auto_score REAL,               -- 0..1 auto-checkable portion
  screening_submitted_at TEXT,
  reasoning_review TEXT,                    -- company's note on the reasoning item
  reasoning_score  REAL,                    -- 0..1 human judgement
  rank_score       REAL,                    -- combined blind score used to rank
  -- finalist task
  terms_accepted   INTEGER NOT NULL DEFAULT 0,
  deliverable_name TEXT,
  deliverable_summary TEXT,
  deliverable_link TEXT,
  deliverable_text TEXT,
  submitted_at     TEXT,
  -- live defense
  defense_slot     TEXT,
  defense_link     TEXT,
  defense_minutes  INTEGER,
  -- result / recognition
  reputation_awarded INTEGER NOT NULL DEFAULT 0,
  badge_awarded    TEXT,
  UNIQUE (task_id, student_id)
);

-- Structured ratings (both directions). subject_role: who is rated.
CREATE TABLE IF NOT EXISTS ratings (
  id            TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_user     TEXT NOT NULL REFERENCES users(id),
  subject_user  TEXT NOT NULL REFERENCES users(id),
  subject_role  TEXT NOT NULL CHECK (subject_role IN ('student','company')),
  quality       INTEGER,
  communication INTEGER,
  met_deadline  INTEGER,
  note          TEXT DEFAULT '',
  created_at    TEXT NOT NULL
);

-- Badges accumulated on a student profile (auto-issued from scores)
CREATE TABLE IF NOT EXISTS badges (
  id         TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'ti-award',
  count      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- IP assignment agreements (ownership transfers only via signed agreement)
CREATE TABLE IF NOT EXISTS agreements (
  id             TEXT PRIMARY KEY,
  task_id        TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id     TEXT NOT NULL REFERENCES users(id),
  company_id     TEXT NOT NULL REFERENCES users(id),
  terms          TEXT NOT NULL,
  portfolio_carveout INTEGER NOT NULL DEFAULT 1,
  payment_amount INTEGER NOT NULL DEFAULT 0,
  student_signed INTEGER NOT NULL DEFAULT 0,
  company_signed INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT DEFAULT '',
  icon       TEXT DEFAULT 'ti-bell',
  link       TEXT,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Password reset tokens (single-use, time-limited)
CREATE TABLE IF NOT EXISTS password_resets (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Admin: disputes / no-show / decision-miss log
CREATE TABLE IF NOT EXISTS incidents (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,              -- no_show | decision_missed | harvest | dispute | sensitivity
  task_id     TEXT,
  subject_user TEXT,
  detail      TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apps_task ON applications(task_id);
CREATE INDEX IF NOT EXISTS idx_apps_student ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_student ON skills(student_id);
`);

// --- Migrations for databases created before a column existed --------------
// node:sqlite's CREATE TABLE IF NOT EXISTS won't add new columns to an existing
// table, so add them here idempotently.
const taskColumns = db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name);
if (!taskColumns.includes('is_internship')) {
  db.exec('ALTER TABLE tasks ADD COLUMN is_internship INTEGER NOT NULL DEFAULT 0');
}
const skillColumns = db.prepare('PRAGMA table_info(skills)').all().map((c) => c.name);
if (!skillColumns.includes('evidence_url')) db.exec("ALTER TABLE skills ADD COLUMN evidence_url TEXT DEFAULT ''");
if (!skillColumns.includes('evidence_file')) db.exec("ALTER TABLE skills ADD COLUMN evidence_file TEXT DEFAULT ''");
const portfolioColumns = db.prepare('PRAGMA table_info(portfolio)').all().map((c) => c.name);
if (!portfolioColumns.includes('origin')) db.exec("ALTER TABLE portfolio ADD COLUMN origin TEXT NOT NULL DEFAULT 'stepin'");
if (!portfolioColumns.includes('description')) db.exec("ALTER TABLE portfolio ADD COLUMN description TEXT DEFAULT ''");
if (!portfolioColumns.includes('link')) db.exec("ALTER TABLE portfolio ADD COLUMN link TEXT DEFAULT ''");
if (!portfolioColumns.includes('file')) db.exec("ALTER TABLE portfolio ADD COLUMN file TEXT DEFAULT ''");

export default db;
