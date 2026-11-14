import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// ── Données initiales (seed avec identifiants stables et déterministes) ────
const defaultJob = (id, title, category, mode) => ({
  id,
  title,
  category,
  mode,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const defaultJobs = [
  defaultJob('job-web', 'Développeur web', 'Développement', 'Temps plein'),
  defaultJob('job-mob', 'Développeur mobile', 'Développement', 'Temps plein'),
  defaultJob('job-cyb', 'Expert en cybersécurité', 'Sécurité', 'Temps plein'),
  defaultJob('job-des', 'Designer graphique', 'Design', 'Temps plein'),
  defaultJob('job-imp', "Technicien d'imprimerie", 'Impression', 'Temps plein'),
  defaultJob('job-for', 'Formateur informatique', 'Formation', 'Mission'),
];

// ───────────────────────────────────────────────────────────────────────────
// STRATÉGIE 1 : PostgreSQL / Neon Serverless (si DATABASE_URL configurée)
// ───────────────────────────────────────────────────────────────────────────
let pgPool = null;
let pgInitPromise = null;

function getPgPool() {
  if (!pgPool && dbUrl) {
    pgPool = new Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pgPool;
}

async function initPgTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS upesi_records (
      table_name VARCHAR(50) NOT NULL,
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_upesi_records_table ON upesi_records (table_name, created_at DESC);

    CREATE TABLE IF NOT EXISTS upesi_meta (
      key VARCHAR(50) PRIMARY KEY,
      value JSONB NOT NULL
    );
  `);

  // Seed des offres si la table jobs est vide
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM upesi_records WHERE table_name = 'jobs'`);
  if (rows[0].count === 0) {
    for (const j of defaultJobs) {
      await pool.query(
        `INSERT INTO upesi_records (table_name, id, data, created_at) VALUES ('jobs', $1, $2, $3) ON CONFLICT DO NOTHING`,
        [j.id, JSON.stringify(j), j.createdAt]
      );
    }
  }
}

async function ensurePgReady() {
  const pool = getPgPool();
  if (!pool) return null;
  if (!pgInitPromise) {
    pgInitPromise = initPgTables(pool).catch((err) => {
      console.error('Erreur initialisation PostgreSQL/Neon :', err.message);
      pgInitPromise = null;
      throw err;
    });
  }
  await pgInitPromise;
  return pool;
}

// ───────────────────────────────────────────────────────────────────────────
// STRATÉGIE 2 : Fichier JSON local (mode développement ou fallback)
// ───────────────────────────────────────────────────────────────────────────
// Sur Vercel sans DATABASE_URL, utilise /tmp pour ne pas faire planter la fonction
const defaultFilePath = process.env.VERCEL
  ? '/tmp/upesitech_db.json'
  : (process.env.DATA_FILE || 'data/db.json');
const file = path.resolve(defaultFilePath);

let fileData = null;
let fileQueue = Promise.resolve();

const seedFile = () => ({
  quotes: [],
  applications: [],
  jobs: [...defaultJobs],
  meta: {
    quoteCounter: 0,
    adminAuth: null,
  },
});

async function loadFile() {
  if (fileData) return fileData;
  try {
    fileData = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!fileData.meta) fileData.meta = { quoteCounter: 0, adminAuth: null };
  } catch {
    fileData = seedFile();
    await saveFile();
  }
  return fileData;
}

function saveFile() {
  fileQueue = fileQueue.then(async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(fileData, null, 2));
    await fs.rename(tmp, file);
  });
  return fileQueue;
}

// ───────────────────────────────────────────────────────────────────────────
// MODULE UNIFIÉ DB (Interface all / insert / update / remove + meta)
// ───────────────────────────────────────────────────────────────────────────
export const db = {
  async all(table) {
    const pool = await ensurePgReady().catch(() => null);
    if (pool) {
      const { rows } = await pool.query(
        `SELECT data FROM upesi_records WHERE table_name = $1 ORDER BY created_at DESC`,
        [table]
      );
      return rows.map((r) => r.data);
    }

    const d = await loadFile();
    return d[table] || [];
  },

  async insert(table, row) {
    const pool = await ensurePgReady().catch(() => null);
    const rec = { id: randomUUID(), createdAt: new Date().toISOString(), ...row };

    if (pool) {
      await pool.query(
        `INSERT INTO upesi_records (table_name, id, data, created_at) VALUES ($1, $2, $3, $4)`,
        [table, rec.id, JSON.stringify(rec), rec.createdAt]
      );
      return rec;
    }

    const d = await loadFile();
    if (!d[table]) d[table] = [];
    d[table].unshift(rec);
    await saveFile();
    return rec;
  },

  async update(table, id, patch) {
    const pool = await ensurePgReady().catch(() => null);
    if (pool) {
      const { rows } = await pool.query(
        `SELECT data FROM upesi_records WHERE table_name = $1 AND id = $2`,
        [table, id]
      );
      if (!rows.length) return null;
      const updated = { ...rows[0].data, ...patch };
      // Si une clé a été explicitement passée à null ou undefined (ex: deadline effacée)
      Object.keys(patch).forEach((k) => {
        if (patch[k] === null || patch[k] === undefined) delete updated[k];
      });
      await pool.query(
        `UPDATE upesi_records SET data = $1 WHERE table_name = $2 AND id = $3`,
        [JSON.stringify(updated), table, id]
      );
      return updated;
    }

    const d = await loadFile();
    const list = d[table] || [];
    let rec = list.find((r) => r.id === id);
    // Recherche de secours par titre si l'identifiant a changé entre temps
    if (!rec && table === 'jobs') {
      rec = list.find((r) => r.title === patch.title || (patch.title && r.title?.toLowerCase() === patch.title?.toLowerCase()));
    }
    if (!rec) return null;
    Object.assign(rec, patch);
    Object.keys(patch).forEach((k) => {
      if (patch[k] === null || patch[k] === undefined) delete rec[k];
    });
    await saveFile();
    return rec;
  },

  async remove(table, id) {
    const pool = await ensurePgReady().catch(() => null);
    if (pool) {
      const result = await pool.query(
        `DELETE FROM upesi_records WHERE table_name = $1 AND id = $2`,
        [table, id]
      );
      return (result.rowCount ?? 0) > 0;
    }

    const d = await loadFile();
    const list = d[table] || [];
    const n = list.length;
    d[table] = list.filter((r) => r.id !== id);
    await saveFile();
    return d[table].length < n;
  },

  // ── Compteur persistant de devis (sans doublon après suppression) ────────
  async getNextQuoteRef() {
    const pool = await ensurePgReady().catch(() => null);
    if (pool) {
      const { rows } = await pool.query(`
        INSERT INTO upesi_meta (key, value)
        VALUES ('quote_counter', '{"count": 1}')
        ON CONFLICT (key) DO UPDATE
        SET value = jsonb_set(
          upesi_meta.value,
          '{count}',
          to_jsonb(COALESCE((upesi_meta.value->>'count')::int, 0) + 1)
        )
        RETURNING (value->>'count')::int AS next_val;
      `);
      const val = rows[0]?.next_val || 1;
      return 'UT-' + String(val).padStart(4, '0');
    }

    const d = await loadFile();
    if (!d.meta) d.meta = { quoteCounter: 0 };
    d.meta.quoteCounter = (d.meta.quoteCounter || 0) + 1;
    await saveFile();
    return 'UT-' + String(d.meta.quoteCounter).padStart(4, '0');
  },

  // ── Authentification persistante (mot de passe haché + version de session) ──
  async getAdminAuth() {
    const pool = await ensurePgReady().catch(() => null);
    if (pool) {
      const { rows } = await pool.query(`SELECT value FROM upesi_meta WHERE key = 'admin_auth'`);
      return rows[0]?.value || null;
    }
    const d = await loadFile();
    return d.meta?.adminAuth || null;
  },

  async setAdminAuth(authData) {
    const pool = await ensurePgReady().catch(() => null);
    if (pool) {
      await pool.query(`
        INSERT INTO upesi_meta (key, value)
        VALUES ('admin_auth', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [JSON.stringify(authData)]);
      return;
    }
    const d = await loadFile();
    if (!d.meta) d.meta = {};
    d.meta.adminAuth = authData;
    await saveFile();
  },
};
