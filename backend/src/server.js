import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { notify } from './mail.js';

const { PORT = 4000, JWT_SECRET, ADMIN_PASSWORD, CLIENT_ORIGIN = 'http://localhost:5173' } = process.env;
if (!JWT_SECRET || !ADMIN_PASSWORD) {
  console.error('Définissez JWT_SECRET et ADMIN_PASSWORD dans backend/.env');
  process.exit(1);
}

const SERVICE_IDS = ['web', 'mob', 'auto', 'cyb', 'for', 'des', 'imp'];
const STATUSES = ['nouveau', 'en cours', 'traité'];
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const auth = (req, res, next) => {
  try { jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Connexion requise.' }); }
};

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false })); // CSP désactivée : polices Google + front servi ici
app.use(cors({ origin: CLIENT_ORIGIN.split(',') }));
app.use(express.json({ limit: '50kb' }));
const formLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de demandes, réessayez plus tard.' } });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { error: 'Trop de tentatives, réessayez plus tard.' } });

// ---------- Public ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/jobs', wrap(async (_req, res) => {
  const jobs = (await db.all('jobs')).filter((j) => j.active !== false);
  res.json(jobs.map(({ id, title, category, mode }) => ({ id, title, category, mode })));
}));

app.post('/api/quotes', formLimit, wrap(async (req, res) => {
  const b = req.body || {};
  const services = Array.isArray(b.services) ? [...new Set(b.services.filter((s) => SERVICE_IDS.includes(s)))] : [];
  const q = { name: str(b.name, 120), org: str(b.org, 120), contact: str(b.contact, 120), deadline: str(b.deadline, 80), message: str(b.message, 3000), services };
  if (!services.length) return res.status(400).json({ error: 'Choisissez au moins un service.' });
  if (!q.name || !q.contact || !q.message) return res.status(400).json({ error: 'Renseignez votre nom, un moyen de vous joindre et votre projet.' });
  const ref = 'UT-' + String((await db.all('quotes')).length + 1).padStart(4, '0');
  await db.insert('quotes', { ...q, ref, status: 'nouveau' });
  notify(`Nouvelle demande de devis ${ref}`, `${q.name} (${q.org || 'particulier'})\nContact : ${q.contact}\nServices : ${services.join(', ')}\nDélai : ${q.deadline}\n\n${q.message}`);
  res.status(201).json({ ref });
}));

app.post('/api/applications', formLimit, wrap(async (req, res) => {
  const b = req.body || {};
  const a = { job: str(b.job, 120), name: str(b.name, 120), contact: str(b.contact, 120) };
  if (!a.job || !a.name || !a.contact) return res.status(400).json({ error: 'Renseignez votre nom et un moyen de vous joindre.' });
  await db.insert('applications', a);
  notify(`Candidature : ${a.job}`, `${a.name}\nContact : ${a.contact}`);
  res.status(201).json({ ok: true });
}));

// ---------- Admin ----------
app.post('/api/admin/login', loginLimit, (req, res) => {
  if (!same(str(req.body?.password, 200), ADMIN_PASSWORD)) return res.status(401).json({ error: 'Mot de passe incorrect.' });
  res.json({ token: jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' }) });
});
app.get('/api/admin/quotes', auth, wrap(async (_req, res) => res.json(await db.all('quotes'))));
app.patch('/api/admin/quotes/:id', auth, wrap(async (req, res) => {
  if (!STATUSES.includes(req.body?.status)) return res.status(400).json({ error: 'Statut invalide.' });
  const r = await db.update('quotes', req.params.id, { status: req.body.status });
  r ? res.json(r) : res.status(404).json({ error: 'Introuvable.' });
}));
app.get('/api/admin/applications', auth, wrap(async (_req, res) => res.json(await db.all('applications'))));
app.get('/api/admin/jobs', auth, wrap(async (_req, res) => res.json(await db.all('jobs'))));
app.post('/api/admin/jobs', auth, wrap(async (req, res) => {
  const j = { title: str(req.body?.title, 120), category: str(req.body?.category, 60), mode: str(req.body?.mode, 40) || 'Temps plein', active: true };
  if (!j.title || !j.category) return res.status(400).json({ error: 'Titre et catégorie obligatoires.' });
  res.status(201).json(await db.insert('jobs', j));
}));
app.delete('/api/admin/jobs/:id', auth, wrap(async (req, res) => {
  (await db.remove('jobs', req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Introuvable.' });
}));

// ---------- Front compilé (production) ----------
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false }));
  app.get(/^\/(?!api).*/, (req, res, next) => {
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route inconnue.' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Erreur serveur.' }); });

app.listen(PORT, () => console.log(`API UpesiTech sur http://localhost:${PORT}`));
