import nodemailer from 'nodemailer';

/*
 * Email sender. Configured entirely through environment variables so no
 * credentials live in the repo. If SMTP is not configured, isConfigured()
 * returns false and callers fall back to showing the reset link on screen.
 *
 * Gmail example (.env):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_USER=youraddress@gmail.com
 *   SMTP_PASS=your-16-char-app-password
 *   SMTP_FROM=StepIn <youraddress@gmail.com>
 *   APP_URL=http://localhost:5173
 */

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
// On Render the public URL is auto-provided as RENDER_EXTERNAL_URL, so email
// reset links point at the live site without any manual configuration.
export const APP_URL =
  process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';

let transporter = null;
export function isConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    const port = Number(SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'not_configured' };
  const from = SMTP_FROM || `StepIn <${SMTP_USER}>`;
  await t.sendMail({ from, to, subject, html, text });
  return { sent: true };
}

// Verify SMTP credentials at boot (logs a clear line either way).
export async function verifyEmail() {
  const t = getTransporter();
  if (!t) {
    console.log('Email: SMTP not configured — password-reset links will be shown on screen (demo mode).');
    return false;
  }
  try {
    await t.verify();
    console.log(`Email: SMTP ready via ${SMTP_HOST} as ${SMTP_USER}.`);
    return true;
  } catch (err) {
    console.warn(`Email: SMTP configured but verification failed (${err.message}). Falling back to on-screen links.`);
    return false;
  }
}

export function resetEmailTemplate(name, resetUrl) {
  const safeName = name || 'there';
  const text = `Hi ${safeName},

We received a request to reset your StepIn password.

Reset it here (link expires in 1 hour):
${resetUrl}

If you didn't request this, you can safely ignore this email.

— StepIn`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1a231e">
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0 16px">
      <div style="width:32px;height:32px;border-radius:8px;background:#1d9e75;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px">S</div>
      <span style="font-size:18px;font-weight:600">StepIn</span>
    </div>
    <h1 style="font-size:20px;margin:0 0 12px">Reset your password</h1>
    <p style="font-size:14px;line-height:1.6;color:#5a635d;margin:0 0 20px">
      Hi ${safeName}, we received a request to reset your StepIn password. Click the button below to choose a new one. This link expires in 1 hour.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:#ba7517;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:8px">Reset password</a>
    <p style="font-size:12px;line-height:1.6;color:#8d948e;margin:22px 0 0">
      If the button doesn't work, paste this link into your browser:<br>
      <a href="${resetUrl}" style="color:#185fa5;word-break:break-all">${resetUrl}</a>
    </p>
    <p style="font-size:12px;line-height:1.6;color:#8d948e;margin:16px 0 0">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>`;

  return { text, html };
}
