import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './util.js';
import db from './db.js';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: '30d',
  });
}

// Populates req.user from the Authorization: Bearer <token> header (or cookie).
export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || req.cookies?.stepin_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not allowed for this role' });
    }
    next();
  };
}

// Optional auth — attaches req.user when a valid token is present, else continues.
export function authOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || req.cookies?.stepin_token;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(payload.id);
      if (user) req.user = user;
    } catch {
      /* ignore */
    }
  }
  next();
}
