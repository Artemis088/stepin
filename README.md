# StepIn — internship & first-experience platform

A full-stack implementation of the StepIn design + system specification: a marketplace where
companies post small, scoped, sample-data tasks and students do them to earn a verified track
record. Built to match the approved mockups (Figtree + Tabler icons, teal/amber/blue token system).

## Stack

- **Frontend** — React 18 + Vite + React Router. Design tokens in `client/src/theme.css`.
- **Backend** — Node.js + Express, using Node's built-in `node:sqlite` (no native build step).
  JWT auth (`bcryptjs` + `jsonwebtoken`). Database file: `server/stepin.db` (auto-created & seeded).

## Running it

Open two terminals.

**1. Backend** (port 4000):
```bash
cd stepin/server
npm install
npm start           # seeds demo data on first run
```

**2. Frontend** (port 5173, proxies /api to :4000):
```bash
cd stepin/client
npm install
npm run dev
```

Then open http://localhost:5173

### Enabling real password-reset emails

Out of the box the app runs in **demo mode**: the password-reset link is shown on screen.
To send real emails (e.g. for a live presentation), configure Gmail SMTP:

1. Use a Google account with **2-Step Verification** turned on.
2. Google account → **Security → App passwords** → create one for "Mail". Google gives you a
   16-character password.
3. In `stepin/server`, copy `.env.example` to `.env` and fill in your Gmail address and that
   app password (see the comments in the file).
4. Restart the backend (`npm start`). On boot it prints `Email: SMTP ready …`.

Now "Forgot password?" emails a branded reset link to the account's email address. If SMTP is
missing or fails, it automatically falls back to the on-screen link, so the flow never breaks.
`.env` is git-ignored — your credentials never get committed.

### Demo logins (password: `password`)

| Role    | Email                     |
|---------|---------------------------|
| Student | `nino@student.ge`         |
| Company | `careers@tbcbank.com.ge`  |
| Admin   | `admin@stepin.ge`         |

The top-bar **Student / Company / Admin** switch jumps between the three demo experiences.
To reseed the database: `cd stepin/server && npm run seed`.

## What's implemented

**Auth** — landing, role selection, login, signup, and password reset (forgot-password issues a
single-use, 1-hour token; with no email server in the demo the reset link is shown on screen).

**Student** — landing, role selection, onboarding (profile build + verified/unverified skills),
task browse & detail, blind screening step, applications funnel tracker, verified profile,
finalist task workspace (per-task terms + IP carve-out up front), live defense, notifications,
IP-assignment signing.

**Company** — vetting onboarding (registry/tax-ID/company-domain email + agreement → probation),
dashboard (probation banner + concurrent-task cap), post-a-task (four deadlines, two caps,
data-sensitivity gate, motive, compensation), funnel management + blind reasoning review,
shortlist review & selection, structured ratings, company profile.

**Admin console** — company vetting & probation, task sensitivity moderation, screening-template
management, blind-scoring & shortlist-slot configuration, disputes & no-shows (backup promotion).

**System mechanics** — the funnel (applied → screening → 3–5 finalists), blind auto-scoring +
company reasoning review, shortlist = merit slots + reserved newcomer slots, reputation & auto
badges, two-sided structured ratings with early-review protection, company probation → trusted,
deadline sweep (no-show handling, missed-decision probation signal), IP transfer only via signed
agreement with mandatory portfolio carve-out.

## Layout

```
stepin/
  server/   Express API + node:sqlite (routes/, logic.js, serialize.js, db.js, seed.js)
  client/   React + Vite (src/pages/{student,company,admin}, components/, theme.css)
```
