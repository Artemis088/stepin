import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';
import { sweepDeadlines } from './logic.js';
import { ensureSeed } from './seed.js';
import { verifyEmail } from './email.js';
import { UPLOAD_DIR } from './upload.js';

import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import taskRoutes from './routes/tasks.js';
import applicationRoutes from './routes/applications.js';
import companyRoutes from './routes/company.js';
import miscRoutes from './routes/misc.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'stepin' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/company', companyRoutes);
app.use('/api', miscRoutes);
app.use('/api/admin', adminRoutes);

// Serve uploaded evidence files (registered before the SPA fallback so it
// doesn't swallow these requests).
app.use('/uploads', express.static(UPLOAD_DIR));

// In production (e.g. Render) the same server also serves the built React app,
// so the whole site runs on one origin — no CORS or proxy needed. In local dev
// the client is served by Vite on :5173 and this block is simply skipped.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API route returns index.html so client-side routing works.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('Serving built client from', clientDist);
}

// Fallback error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// Seed demo data on first run, then run a deadline sweep periodically.
ensureSeed();
sweepDeadlines();
setInterval(sweepDeadlines, 60 * 1000);
verifyEmail();

app.listen(PORT, () => {
  console.log(`StepIn API running on http://localhost:${PORT}`);
});
