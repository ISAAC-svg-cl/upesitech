// Point d'entrée Vercel Serverless – adapte le serveur Express existant
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// ── Variables d'environnement avec valeurs par défaut de secours ───────────
const JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
  ? process.env.JWT_SECRET
  : 'upesitech-super-secret-jwt-key-minimum-32-chars-ok';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@upesitech.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changez-moi';

const adminPasswordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
const ADMIN_EMAIL_NORMALIZED = ADMIN_EMAIL.trim().toLowerCase();

// ── Base de données en mémoire (seed au démarrage) ─────────────────────────
// Sur Vercel les fonctions serverless sont éphémères : les données sont
// réinitialisées à chaque redéploiement. Suffisant pour une démo.
const makeJob = (title, category, mode) => ({
  id: randomUUID(), title, category, mode, active: true,
  createdAt: new Date().toISOString(),
});

let DB = {
  quotes: [],
  applications: [],
  jobs: [
    makeJob('Développeur web', 'Développement', 'Temps plein'),
    makeJob('Développeur mobile', 'Développement', 'Temps plein'),
    makeJob('Expert en cybersécurité', 'Sécurité', 'Temps plein'),
    makeJob('Designer graphique', 'Design', 'Temps plein'),
    makeJob("Technicien d'imprimerie", 'Impression', 'Temps plein'),
    makeJob('Formateur informatique', 'Formation', 'Mission'),
  ],
};

const db = {
  all: (t) => DB[t],
  insert(t, row) {
    const rec = { id: randomUUID(), createdAt: new Date().toISOString(), ...row };
    DB[t].unshift(rec);
    return rec;
  },
  update(t, id, patch) {
    const rec = DB[t].find((r) => r.id === id);
    if (!rec) return null;
    Object.assign(rec, patch);
    return rec;
  },
  remove(t, id) {
    const n = DB[t].length;
    DB[t] = DB[t].filter((r) => r.id !== id);
    return DB[t].length < n;
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const SERVICE_IDS = ['web', 'mob', 'auto', 'cyb', 'for', 'des', 'imp'];
const STATUSES = ['nouveau', 'en cours', 'traité'];
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const auth = (req, res, next) => {
  try {
    const payload = jwt.verify(
      (req.headers.authorization || '').replace('Bearer ', ''),
      JWT_SECRET
    );
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Connexion requise.' });
  }
};

// ── Application Express ────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50kb' }));

const formLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de demandes, réessayez plus tard.' } });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { error: 'Trop de tentatives, réessayez plus tard.' } });

// ── Routes publiques ───────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/jobs', wrap(async (_req, res) => {
  const jobs = db.all('jobs').filter((j) => j.active !== false);
  res.json(jobs.map(({ id, title, category, mode }) => ({ id, title, category, mode })));
}));

app.post('/api/quotes', formLimit, wrap(async (req, res) => {
  const b = req.body || {};
  const services = Array.isArray(b.services)
    ? [...new Set(b.services.filter((s) => SERVICE_IDS.includes(s)))]
    : [];
  const q = {
    name: str(b.name, 120), org: str(b.org, 120),
    contact: str(b.contact, 120), deadline: str(b.deadline, 80),
    message: str(b.message, 3000), services,
  };
  if (!services.length) return res.status(400).json({ error: 'Choisissez au moins un service.' });
  if (!q.name || !q.contact || !q.message)
    return res.status(400).json({ error: 'Renseignez votre nom, un moyen de vous joindre et votre projet.' });
  const ref = 'UT-' + String(db.all('quotes').length + 1).padStart(4, '0');
  db.insert('quotes', { ...q, ref, status: 'nouveau' });
  res.status(201).json({ ref });
}));

app.post('/api/applications', formLimit, wrap(async (req, res) => {
  const b = req.body || {};
  const a = { job: str(b.job, 120), name: str(b.name, 120), contact: str(b.contact, 120) };
  if (!a.job || !a.name || !a.contact)
    return res.status(400).json({ error: 'Renseignez votre nom et un moyen de vous joindre.' });
  db.insert('applications', a);
  res.status(201).json({ ok: true });
}));

// ── Routes admin ───────────────────────────────────────────────────────────
app.post('/api/admin/login', loginLimit, wrap(async (req, res) => {
  const email = str(req.body?.email, 120).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const emailOk = email.length > 0 && email === ADMIN_EMAIL_NORMALIZED;
  const passwordOk = await bcrypt.compare(password, adminPasswordHash);
  if (!emailOk || !passwordOk)
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  res.json({
    token: jwt.sign({ role: 'admin', email: ADMIN_EMAIL_NORMALIZED }, JWT_SECRET, { expiresIn: '8h' }),
  });
}));

app.get('/api/admin/me', auth, (_req, res) => res.json({ ok: true, email: ADMIN_EMAIL_NORMALIZED }));

app.get('/api/admin/quotes', auth, wrap(async (_req, res) => res.json(db.all('quotes'))));
app.patch('/api/admin/quotes/:id', auth, wrap(async (req, res) => {
  if (!STATUSES.includes(req.body?.status))
    return res.status(400).json({ error: 'Statut invalide.' });
  const r = db.update('quotes', req.params.id, { status: req.body.status });
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));

app.get('/api/admin/applications', auth, wrap(async (_req, res) => res.json(db.all('applications'))));
app.get('/api/admin/jobs', auth, wrap(async (_req, res) => res.json(db.all('jobs'))));
app.post('/api/admin/jobs', auth, wrap(async (req, res) => {
  const j = {
    title: str(req.body?.title, 120), category: str(req.body?.category, 60),
    mode: str(req.body?.mode, 40) || 'Temps plein', active: true,
  };
  if (!j.title || !j.category)
    return res.status(400).json({ error: 'Titre et catégorie obligatoires.' });
  res.status(201).json(db.insert('jobs', j));
}));
app.delete('/api/admin/jobs/:id', auth, wrap(async (req, res) => {
  db.remove('jobs', req.params.id)
    ? res.json({ ok: true })
    : res.status(404).json({ error: 'Introuvable.' });
}));

// ── Fallback 404 API ───────────────────────────────────────────────────────
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route inconnue.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur.' });
});

export default app;

