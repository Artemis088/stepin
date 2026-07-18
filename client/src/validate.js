// Shared client-side validators.

// Basic but effective email shape check: something@something.tld with no spaces.
// Mirrors the server-side check so the two never disagree.
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// True only for a well-formed http(s) URL. Mirrors server util isValidUrl.
export function isValidUrl(v) {
  try {
    const u = new URL(String(v).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
