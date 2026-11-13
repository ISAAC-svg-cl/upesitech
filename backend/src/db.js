import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const file = path.resolve(process.env.DATA_FILE || 'data/db.json');
const job = (title, category, mode) => ({ id: randomUUID(), title, category, mode, active: true, createdAt: new Date().toISOString() });
const seed = () => ({
  quotes: [],
  applications: [],
  jobs: [
    job('Développeur web', 'Développement', 'Temps plein'),
    job('Développeur mobile', 'Développement', 'Temps plein'),
    job('Expert en cybersécurité', 'Sécurité', 'Temps plein'),
    job('Designer graphique', 'Design', 'Temps plein'),
    job("Technicien d'imprimerie", 'Impression', 'Temps plein'),
    job('Formateur informatique', 'Formation', 'Mission'),
  ],
});

let data = null;
let queue = Promise.resolve();

async function load() {
  if (data) return data;
  try { data = JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { data = seed(); await save(); }
  return data;
}
// Écritures sérialisées + remplacement atomique du fichier
function save() {
  queue = queue.then(async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, file);
  });
  return queue;
}

export const db = {
  async all(table) { return (await load())[table]; },
  async insert(table, row) {
    const d = await load();
    const rec = { id: randomUUID(), createdAt: new Date().toISOString(), ...row };
    d[table].unshift(rec);
    await save();
    return rec;
  },
  async update(table, id, patch) {
    const d = await load();
    const rec = d[table].find((r) => r.id === id);
    if (!rec) return null;
    Object.assign(rec, patch);
    await save();
    return rec;
  },
  async remove(table, id) {
    const d = await load();
    const n = d[table].length;
    d[table] = d[table].filter((r) => r.id !== id);
    await save();
    return d[table].length < n;
  },
};
