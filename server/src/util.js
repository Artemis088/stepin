import { customAlphabet } from 'nanoid';

export const id = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

export const now = () => new Date().toISOString();

export const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

// Parse a JSON column safely
export const parseJson = (v, fallback) => {
  try {
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};

// Human "in Nd" / "Nd left" / "overdue" from an ISO deadline
export const timeLeft = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.round(ms / 86400000);
  if (ms < 0) return { overdue: true, label: 'overdue', days };
  if (days === 0) return { overdue: false, label: 'today', days: 0 };
  if (days === 1) return { overdue: false, label: 'in 1d', days: 1 };
  return { overdue: false, label: `in ${days}d`, days };
};

export const JWT_SECRET =
  process.env.STEPIN_JWT_SECRET || 'stepin-dev-secret-change-me';

// Basic email-shape validation (something@something.tld, no spaces).
// Mirrors the client-side check in client/src/validate.js.
export const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
