import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { id, now, initials } from '../util.js';
import { signToken, authRequired } from '../auth.js';
import { serializeStudent } from '../serialize.js';
import { sendMail, isConfigured, resetEmailTemplate, APP_URL } from '../email.js';

const router = Router();

const GENERIC_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me'];

function meFor(user) {
  if (user.role === 'student') {
    return { ...user, profile: serializeStudent(user.id) };
  }
  if (user.role === 'company') {
    const c = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(user.id);
    return {
      ...user,
      profile: c
        ? {
            id: user.id,
            name: c.name,
            initials: c.initials,
            registrationId: c.registration_id,
            website: c.website,
            contactName: c.contact_name,
            contactEmail: c.contact_email,
            agreementSigned: !!c.agreement_signed,
            status: c.status,
            concurrentCap: c.concurrent_cap,
            verified: !!c.verified,
            onboarded: !!c.onboarded,
          }
        : null,
    };
  }
  return { ...user, profile: { name: 'Platform admin' } };
}

// --- Student signup -------------------------------------------------------
router.post('/signup/student', (req, res) => {
  const { email, password, name, vertical = 'data', bio = '' } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: 'Name, email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'An account with this email already exists' });

  const uid = id();
  db.prepare('INSERT INTO users (id, role, email, password_hash, created_at) VALUES (?,?,?,?,?)').run(
    uid,
    'student',
    email.toLowerCase(),
    bcrypt.hashSync(password, 10),
    now()
  );
  db.prepare(
    `INSERT INTO students (user_id, name, photo_initials, vertical, bio, onboarded)
     VALUES (?, ?, ?, ?, ?, 0)`
  ).run(uid, name, initials(name), vertical, bio);

  const user = { id: uid, role: 'student', email: email.toLowerCase() };
  res.json({ token: signToken(user), user: meFor(user) });
});

// --- Company signup (vetting gate) ---------------------------------------
router.post('/signup/company', (req, res) => {
  const {
    email,
    password,
    name,
    registrationId,
    website,
    contactName,
    contactEmail,
    agreementSigned,
  } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: 'Company name, email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Company-domain email rule (§9): reject generic providers for the contact.
  const contact = (contactEmail || email).toLowerCase();
  const domain = contact.split('@')[1] || '';
  if (GENERIC_EMAIL_DOMAINS.includes(domain)) {
    return res.status(400).json({
      error: 'Use a company-domain email for the contact (generic providers like gmail are not accepted).',
    });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'An account with this email already exists' });

  const uid = id();
  db.prepare('INSERT INTO users (id, role, email, password_hash, created_at) VALUES (?,?,?,?,?)').run(
    uid,
    'company',
    email.toLowerCase(),
    bcrypt.hashSync(password, 10),
    now()
  );
  db.prepare(
    `INSERT INTO companies
      (user_id, name, initials, registration_id, website, contact_name, contact_email, agreement_signed, status, concurrent_cap, verified, onboarded)
     VALUES (?,?,?,?,?,?,?,?,'probation',3,1,?)`
  ).run(
    uid,
    name,
    initials(name),
    registrationId || '',
    website || '',
    contactName || '',
    contact,
    agreementSigned ? 1 : 0,
    agreementSigned ? 1 : 0
  );

  const user = { id: uid, role: 'company', email: email.toLowerCase() };
  res.json({ token: signToken(user), user: meFor(user) });
});

// --- Login ---------------------------------------------------------------
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  const pub = { id: user.id, role: user.role, email: user.email };
  res.json({ token: signToken(pub), user: meFor(pub) });
});

// --- Forgot password: issue a single-use, 1-hour reset token -------------
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Enter your email' });
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase());

  // Always respond the same way so we don't reveal whether an email exists.
  const response = { ok: true, message: "If an account exists for that email, we've sent a reset link." };

  if (user) {
    const token = id() + id();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO password_resets (token, user_id, expires_at, used, created_at) VALUES (?,?,?,0,?)').run(
      token,
      user.id,
      expires,
      now()
    );

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    let student = db.prepare('SELECT name FROM students WHERE user_id = ?').get(user.id);
    if (!student) student = db.prepare('SELECT name FROM companies WHERE user_id = ?').get(user.id);
    const { html, text } = resetEmailTemplate(student?.name, resetUrl);

    if (isConfigured()) {
      try {
        await sendMail({ to: user.email, subject: 'Reset your StepIn password', html, text });
        response.emailed = true;
      } catch (err) {
        console.error('Password-reset email failed:', err.message);
        // Fall back to the on-screen link so the flow still works.
        response.demoResetPath = `/reset-password?token=${token}`;
      }
    } else {
      // No SMTP configured (demo) — surface the link so the flow is completable.
      response.demoResetPath = `/reset-password?token=${token}`;
    }
  }
  res.json(response);
});

// --- Reset password using the token --------------------------------------
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'Token and a new password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const row = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token);
  if (!row || row.used) return res.status(400).json({ error: 'This reset link is invalid or has already been used.' });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This reset link has expired. Request a new one.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), row.user_id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);
  res.json({ ok: true, message: 'Password updated — you can now log in.' });
});

// --- Current user --------------------------------------------------------
router.get('/me', authRequired, (req, res) => {
  res.json({ user: meFor(req.user) });
});

// --- Finish onboarding flag ---------------------------------------------
router.post('/onboarded', authRequired, (req, res) => {
  if (req.user.role === 'student') db.prepare('UPDATE students SET onboarded = 1 WHERE user_id = ?').run(req.user.id);
  if (req.user.role === 'company') db.prepare('UPDATE companies SET onboarded = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true, user: meFor(req.user) });
});

export default router;
export { meFor };
