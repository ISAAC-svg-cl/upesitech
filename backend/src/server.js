import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { notify } from './mail.js';

const {
  PORT = 4000,
  CLIENT_ORIGIN = 'http://localhost:5173',
} = process.env;

// ── Validation stricte de la configuration Administrateur ──────────────────
// AUCUN secret ni mot de passe par défaut.
function isAdminConfigured() {
  const secret = process.env.JWT_SECRET?.trim();
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  return Boolean(secret && secret.length >= 32 && email && password);
}

// Récupère ou initialise les informations d'authentification admin en base
async function getEffectiveAdminAuth() {
  if (!isAdminConfigured()) return null;

  const envEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const stored = await db.getAdminAuth();
  if (stored && stored.passwordHash) {
    if (stored.email !== envEmail) {
      stored.email = envEmail;
      await db.setAdminAuth(stored);
    }
    return stored;
  }

  // Initialisation à partir des variables d'environnement
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD.trim(), 10);
  const initialAuth = {
    email: envEmail,
    passwordHash: hash,
    tokenVersion: 1,
    updatedAt: new Date().toISOString(),
  };
  await db.setAdminAuth(initialAuth);
  return initialAuth;
}

const SERVICE_IDS = ['web', 'mob', 'auto', 'cyb', 'for', 'des', 'imp'];
const STATUSES = ['nouveau', 'en cours', 'traité'];
const APP_STATUSES = ['nouveau', 'à rappeler', 'entretien', 'retenu', 'refusé'];
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Middlewares de sécurité ────────────────────────────────────────────────
// Bloque tout accès /api/admin/* si la configuration de sécurité est incomplète
const requireAdminConfig = (_req, res, next) => {
  if (!isAdminConfigured()) {
    return res.status(503).json({ error: 'Configuration serveur incomplète.' });
  }
  next();
};

const auth = wrap(async (req, res, next) => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) return res.status(503).json({ error: 'Configuration serveur incomplète.' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Connexion requise.' });

  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }

  // Vérifie la version du token : après un changement de mot de passe,
  // tous les anciens tokens deviennent invalides.
  const adminAuth = await getEffectiveAdminAuth();
  const expectedVersion = adminAuth?.tokenVersion || 1;
  if (!payload.tokenVersion || payload.tokenVersion !== expectedVersion) {
    return res.status(401).json({ error: 'Session expirée suite à une modification du mot de passe.' });
  }

  req.user = payload;
  next();
});

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use((req, _res, next) => {
  // Normalise les chemins si /api a été tronqué ou réécrit par un proxy/Vercel
  if (
    req.url.startsWith('/jobs') ||
    req.url.startsWith('/quotes') ||
    req.url.startsWith('/applications') ||
    req.url.startsWith('/admin') ||
    req.url.startsWith('/health')
  ) {
    req.url = '/api' + req.url;
  }
  next();
});
app.use(express.json({ limit: '50kb' }));

const formLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de demandes, réessayez plus tard.' } });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { error: 'Trop de tentatives, réessayez plus tard.' } });

// ── Routes publiques (fonctionnent toujours) ──────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/jobs', wrap(async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const jobs = (await db.all('jobs')).filter((j) => {
    if (j.active === false) return false;
    if (j.deadline && j.deadline < today) return false;
    return true;
  });
  res.json(jobs.map(({ id, title, category, mode, deadline }) => ({ id, title, category, mode, deadline })));
}));

app.post('/api/quotes', formLimit, wrap(async (req, res) => {
  const b = req.body || {};
  const services = Array.isArray(b.services) ? [...new Set(b.services.filter((s) => SERVICE_IDS.includes(s)))] : [];
  const q = { name: str(b.name, 120), org: str(b.org, 120), contact: str(b.contact, 120), deadline: str(b.deadline, 80), message: str(b.message, 3000), services };
  if (!services.length) return res.status(400).json({ error: 'Choisissez au moins un service.' });
  if (!q.name || !q.contact || !q.message) return res.status(400).json({ error: 'Renseignez votre nom, un moyen de vous joindre et votre projet.' });

  // Compteur persistant atomique (pas de doublon même après suppression)
  const ref = await db.getNextQuoteRef();
  await db.insert('quotes', { ...q, ref, status: 'nouveau', archived: false, notes: [] });

  // Notification e-mail restaurée
  notify(`Nouvelle demande de devis ${ref}`, `${q.name} (${q.org || 'particulier'})\nContact : ${q.contact}\nServices : ${services.join(', ')}\nDélai : ${q.deadline}\n\n${q.message}`);

  res.status(201).json({ ref });
}));

app.post('/api/applications', formLimit, wrap(async (req, res) => {
  const b = req.body || {};
  const a = { job: str(b.job, 120), name: str(b.name, 120), contact: str(b.contact, 120) };
  if (!a.job || !a.name || !a.contact) return res.status(400).json({ error: 'Renseignez votre nom et un moyen de vous joindre.' });
  await db.insert('applications', { ...a, status: 'nouveau', notes: [] });

  // Notification e-mail restaurée
  notify(`Candidature : ${a.job}`, `${a.name}\nContact : ${a.contact}`);

  res.status(201).json({ ok: true });
}));

// ── Routes admin (protégées par requireAdminConfig) ────────────────────────
app.use('/api/admin', requireAdminConfig);

app.post('/api/admin/login', loginLimit, wrap(async (req, res) => {
  const email = str(req.body?.email, 120).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const adminAuth = await getEffectiveAdminAuth();
  if (!adminAuth) {
    return res.status(503).json({ error: 'Configuration serveur incomplète.' });
  }

  const emailOk = email.length > 0 && email === adminAuth.email.toLowerCase();
  let passwordOk = await bcrypt.compare(password, adminAuth.passwordHash);

  // Fallback de secours : si le mot de passe correspond à ADMIN_PASSWORD dans les variables d'environnement
  if (!passwordOk && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD.trim()) {
    passwordOk = true;
    adminAuth.passwordHash = await bcrypt.hash(password, 10);
    adminAuth.tokenVersion = (adminAuth.tokenVersion || 1) + 1;
    await db.setAdminAuth(adminAuth);
  }

  if (!emailOk || !passwordOk) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }

  const token = jwt.sign(
    { role: 'admin', email: adminAuth.email, tokenVersion: adminAuth.tokenVersion || 1 },
    process.env.JWT_SECRET.trim(),
    { expiresIn: '8h' }
  );

  res.json({ token });
}));

app.get('/api/admin/me', auth, wrap(async (_req, res) => {
  const adminAuth = await getEffectiveAdminAuth();
  res.json({ ok: true, email: adminAuth?.email });
}));

app.get('/api/admin/stats', auth, wrap(async (_req, res) => {
  const quotes = await db.all('quotes');
  const applications = await db.all('applications');
  const jobs = await db.all('jobs');
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

app.get('/api/admin/quotes', auth, wrap(async (_req, res) => res.json(await db.all('quotes'))));

app.patch('/api/admin/quotes/:id', auth, wrap(async (req, res) => {
  if (!STATUSES.includes(req.body?.status)) return res.status(400).json({ error: 'Statut invalide.' });
  const r = await db.update('quotes', req.params.id, { status: req.body.status });
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));

app.patch('/api/admin/quotes/:id/archive', auth, wrap(async (req, res) => {
  const archived = Boolean(req.body?.archived);
  const r = await db.update('quotes', req.params.id, { archived });
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));

app.post('/api/admin/quotes/:id/notes', auth, wrap(async (req, res) => {
  const text = str(req.body?.text, 2000);
  if (!text) return res.status(400).json({ error: 'Note vide.' });
  const quotes = await db.all('quotes');
  const quote = quotes.find((q) => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Introuvable.' });
  const note = { id: randomUUID(), text, createdAt: new Date().toISOString() };
  const notes = Array.isArray(quote.notes) ? [note, ...quote.notes] : [note];
  await db.update('quotes', req.params.id, { notes });
  res.status(201).json(note);
}));

app.delete('/api/admin/quotes/:id', auth, wrap(async (req, res) => {
  (await db.remove('quotes', req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Introuvable.' });
}));

app.get('/api/admin/applications', auth, wrap(async (_req, res) => res.json(await db.all('applications'))));

app.patch('/api/admin/applications/:id', auth, wrap(async (req, res) => {
  if (!APP_STATUSES.includes(req.body?.status)) return res.status(400).json({ error: 'Statut de candidature invalide.' });
  const r = await db.update('applications', req.params.id, { status: req.body.status });
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));

app.post('/api/admin/applications/:id/notes', auth, wrap(async (req, res) => {
  const text = str(req.body?.text, 2000);
  if (!text) return res.status(400).json({ error: 'Note vide.' });
  const apps = await db.all('applications');
  const appItem = apps.find((a) => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Introuvable.' });
  const note = { id: randomUUID(), text, createdAt: new Date().toISOString() };
  const notes = Array.isArray(appItem.notes) ? [note, ...appItem.notes] : [note];
  await db.update('applications', req.params.id, { notes });
  res.status(201).json(note);
}));

app.delete('/api/admin/applications/:id', auth, wrap(async (req, res) => {
  (await db.remove('applications', req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Introuvable.' });
}));

app.get('/api/admin/jobs', auth, wrap(async (_req, res) => res.json(await db.all('jobs'))));

app.post('/api/admin/jobs', auth, wrap(async (req, res) => {
  const deadline = str(req.body?.deadline, 10);
  const j = {
    title: str(req.body?.title, 120),
    category: str(req.body?.category, 60),
    mode: str(req.body?.mode, 40) || 'Temps plein',
    active: true,
    ...(deadline ? { deadline } : {}),
  };
  if (!j.title || !j.category) return res.status(400).json({ error: 'Titre et catégorie obligatoires.' });
  res.status(201).json(await db.insert('jobs', j));
}));

app.patch('/api/admin/jobs/:id', auth, wrap(async (req, res) => {
  const patch = {};
  if (req.body?.title !== undefined) patch.title = str(req.body.title, 120);
  if (req.body?.category !== undefined) patch.category = str(req.body.category, 60);
  if (req.body?.mode !== undefined) patch.mode = str(req.body.mode, 40);
  if (req.body?.active !== undefined) patch.active = Boolean(req.body.active);
  // Permet d'effacer la date limite en envoyant une chaîne vide ou null
  if (req.body?.deadline !== undefined) {
    const d = str(req.body.deadline, 10);
    patch.deadline = d || null;
  }
  let r = await db.update('jobs', req.params.id, patch);
  // Secours : si non trouvé par ID direct, recherche par titre
  if (!r && req.body?.title) {
    const allJobs = await db.all('jobs');
    const match = allJobs.find((j) => j.title.toLowerCase() === req.body.title.trim().toLowerCase());
    if (match) {
      r = await db.update('jobs', match.id, patch);
    }
  }
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));

app.delete('/api/admin/jobs/:id', auth, wrap(async (req, res) => {
  (await db.remove('jobs', req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Introuvable.' });
}));

app.post('/api/admin/change-password', auth, wrap(async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  const adminAuth = await getEffectiveAdminAuth();
  if (!adminAuth) return res.status(503).json({ error: 'Configuration serveur incomplète.' });

  const currentOk = await bcrypt.compare(currentPassword, adminAuth.passwordHash);
  if (!currentOk) return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
  if (newPassword.length < 12) return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 12 caractères.' });

  const newHash = await bcrypt.hash(newPassword, 10);
  // Incrémente la version de token : tous les anciens JWT sont ainsi instantanément révoqués
  const nextVersion = (adminAuth.tokenVersion || 1) + 1;

  await db.setAdminAuth({
    email: adminAuth.email,
    passwordHash: newHash,
    tokenVersion: nextVersion,
    updatedAt: new Date().toISOString(),
  });

  res.json({ ok: true });
}));

// ── Front compilé (uniquement en dev local / node) ─────────────────────────
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (fs.existsSync(dist) && !process.env.VERCEL) {
  app.use(express.static(dist, { index: false }));
  app.get(/^\/(?!api).*/, (req, res, next) => {
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Route inconnue.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur.' });
});

// Écoute locale uniquement (pas sur Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`API UpesiTech sur http://localhost:${PORT}`));
}

export default app;
