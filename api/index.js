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

let adminPasswordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
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
const APP_STATUSES = ['nouveau', 'à rappeler', 'entretien', 'retenu', 'refusé'];
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
  const today = new Date().toISOString().slice(0, 10);
  const jobs = db.all('jobs').filter((j) => {
    if (j.active === false) return false;
    if (j.deadline && j.deadline < today) return false;
    return true;
  });
  res.json(jobs.map(({ id, title, category, mode, deadline }) => ({ id, title, category, mode, deadline })));
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
  db.insert('quotes', { ...q, ref, status: 'nouveau', archived: false, notes: [] });
  res.status(201).json({ ref });
}));

app.post('/api/applications', formLimit, wrap(async (req, res) => {
  const b = req.body || {};
  const a = { job: str(b.job, 120), name: str(b.name, 120), contact: str(b.contact, 120) };
  if (!a.job || !a.name || !a.contact)
    return res.status(400).json({ error: 'Renseignez votre nom et un moyen de vous joindre.' });
  db.insert('applications', { ...a, status: 'nouveau', notes: [] });
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

app.get('/api/admin/stats', auth, wrap(async (_req, res) => {
  const quotes = db.all('quotes');
  const applications = db.all('applications');
  const jobs = db.all('jobs');
  const activeQuotes = quotes.filter((q) => !q.archived);
  res.json({
    quotesTotal: activeQuotes.length,
    quotesNew: activeQuotes.filter((q) => q.status === 'nouveau').length,
    quotesInProgress: activeQuotes.filter((q) => q.status === 'en cours').length,
    quotesDone: activeQuotes.filter((q) => q.status === 'traité').length,
    applicationsTotal: applications.length,
    activeJobs: jobs.filter((j) => j.active !== false).length,
  });
}));

app.get('/api/admin/quotes', auth, wrap(async (_req, res) => res.json(db.all('quotes'))));

app.patch('/api/admin/quotes/:id', auth, wrap(async (req, res) => {
  if (!STATUSES.includes(req.body?.status))
    return res.status(400).json({ error: 'Statut invalide.' });
  const r = db.update('quotes', req.params.id, { status: req.body.status });
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));

app.patch('/api/admin/quotes/:id/archive', auth, wrap(async (req, res) => {
  const archived = Boolean(req.body?.archived);
  const r = db.update('quotes', req.params.id, { archived });
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));

app.post('/api/admin/quotes/:id/notes', auth, wrap(async (req, res) => {
  const text = str(req.body?.text, 2000);
  if (!text) return res.status(400).json({ error: 'Note vide.' });
  const quotes = db.all('quotes');
  const quote = quotes.find((q) => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Introuvable.' });
  const note = { id: randomUUID(), text, createdAt: new Date().toISOString() };
  const notes = Array.isArray(quote.notes) ? [note, ...quote.notes] : [note];
  db.update('quotes', req.params.id, { notes });
  res.status(201).json(note);
}));

app.delete('/api/admin/quotes/:id', auth, wrap(async (req, res) => {
  db.remove('quotes', req.params.id)
    ? res.json({ ok: true })
    : res.status(404).json({ error: 'Introuvable.' });
}));

app.get('/api/admin/applications', auth, wrap(async (_req, res) => res.json(db.all('applications'))));

app.patch('/api/admin/applications/:id', auth, wrap(async (req, res) => {
  if (!APP_STATUSES.includes(req.body?.status))
    return res.status(400).json({ error: 'Statut de candidature invalide.' });
  const r = db.update('applications', req.params.id, { status: req.body.status });
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));

app.post('/api/admin/applications/:id/notes', auth, wrap(async (req, res) => {
  const text = str(req.body?.text, 2000);
  if (!text) return res.status(400).json({ error: 'Note vide.' });
  const apps = db.all('applications');
  const appItem = apps.find((a) => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Introuvable.' });
  const note = { id: randomUUID(), text, createdAt: new Date().toISOString() };
  const notes = Array.isArray(appItem.notes) ? [note, ...appItem.notes] : [note];
  db.update('applications', req.params.id, { notes });
  res.status(201).json(note);
}));

app.delete('/api/admin/applications/:id', auth, wrap(async (req, res) => {
  db.remove('applications', req.params.id)
    ? res.json({ ok: true })
    : res.status(404).json({ error: 'Introuvable.' });
}));

app.get('/api/admin/jobs', auth, wrap(async (_req, res) => res.json(db.all('jobs'))));

app.post('/api/admin/jobs', auth, wrap(async (req, res) => {
  const deadline = str(req.body?.deadline, 10);
  const j = {
    title: str(req.body?.title, 120),
    category: str(req.body?.category, 60),
    mode: str(req.body?.mode, 40) || 'Temps plein',
    active: true,
    ...(deadline ? { deadline } : {}),
  };
  if (!j.title || !j.category)
    return res.status(400).json({ error: 'Titre et catégorie obligatoires.' });
  res.status(201).json(db.insert('jobs', j));
}));

app.patch('/api/admin/jobs/:id', auth, wrap(async (req, res) => {
  const patch = {};
  if (req.body?.title !== undefined) patch.title = str(req.body.title, 120);
  if (req.body?.category !== undefined) patch.category = str(req.body.category, 60);
  if (req.body?.mode !== undefined) patch.mode = str(req.body.mode, 40);
  if (req.body?.active !== undefined) patch.active = Boolean(req.body.active);
  if (req.body?.deadline !== undefined) patch.deadline = str(req.body.deadline, 10);
  const r = db.update('jobs', req.params.id, patch);
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));

app.delete('/api/admin/jobs/:id', auth, wrap(async (req, res) => {
  db.remove('jobs', req.params.id)
    ? res.json({ ok: true })
    : res.status(404).json({ error: 'Introuvable.' });
}));

app.post('/api/admin/change-password', auth, wrap(async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  const currentOk = await bcrypt.compare(currentPassword, adminPasswordHash);
  if (!currentOk) return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
  if (newPassword.length < 12) return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 12 caractères.' });
  adminPasswordHash = await bcrypt.hash(newPassword, 10);
  res.json({ ok: true });
}));

// ── Fallback 404 API ───────────────────────────────────────────────────────
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route inconnue.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur.' });
});

export default app;

