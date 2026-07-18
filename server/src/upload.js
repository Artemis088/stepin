import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { id } from './util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Where uploaded evidence files are stored. Configurable so a hosted deploy can
// point it at a persistent disk (like the DB). Defaults to server/uploads.
export const UPLOAD_DIR = process.env.STEPIN_UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${id()}${ext}`);
  },
});

const single = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, JPG or PNG files are allowed.'));
  },
}).single('evidence');

// Middleware wrapper that turns multer errors (too large / wrong type) into a
// clean 400 instead of a 500, and tolerates requests with no file.
export function evidenceUpload(req, res, next) {
  single(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 10 MB).' : err.message;
      return res.status(400).json({ error: msg });
    }
    next();
  });
}
