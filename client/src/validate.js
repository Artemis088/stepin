// Shared client-side validators.

// Basic but effective email shape check: something@something.tld with no spaces.
// Mirrors the server-side check so the two never disagree.
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
