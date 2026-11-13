import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, TOKEN_KEY } from '../api';
import { SERVICES } from '../data';
import type { Application, Job, Quote, Status } from '../types';

const STATUSES: Status[] = ['nouveau', 'en cours', 'traité'];
const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

function Login({ onOk }: { onOk: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  async function go(e: FormEvent) {
    e.preventDefault();
    try { const { token } = await api.login(pw); sessionStorage.setItem(TOKEN_KEY, token); onOk(); }
    catch (x) { setErr((x as Error).message); }
  }
  return (
    <section className="view on">
      <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
        <h2>Espace administrateur</h2>
        <form onSubmit={go}>
          <label htmlFor="pw">Mot de passe</label>
          <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          <div className="err" role="alert">{err}</div>
          <button className="btn" type="submit">Se connecter</button>
        </form>
      </div>
    </section>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'quotes' | 'apps' | 'jobs'>('quotes');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [nj, setNj] = useState({ title: '', category: '', mode: 'Temps plein' });
  const [err, setErr] = useState('');

  const fail = useCallback((x: unknown) => { const e = x as Error & { status?: number }; if (e.status === 401) onLogout(); else setErr(e.message); }, [onLogout]);
  const load = useCallback(() => {
    Promise.all([api.quotes(), api.applications(), api.adminJobs()]).then(([q, a, j]) => { setQuotes(q); setApps(a); setJobs(j); }).catch(fail);
  }, [fail]);
  useEffect(load, [load]);

  const names = (ids: string[]) => ids.map((id) => SERVICES.find((s) => s.id === id)?.name ?? id).join(', ');
  async function addJob(e: FormEvent) {
    e.preventDefault(); setErr('');
    try { await api.addJob(nj); setNj({ title: '', category: '', mode: 'Temps plein' }); load(); } catch (x) { fail(x); }
  }

  return (
    <section className="view on">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Tableau de bord</h2>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={() => { sessionStorage.removeItem(TOKEN_KEY); onLogout(); }}>Se déconnecter</button>
      </div>
      <div className="filters">
        <button className="chip" aria-pressed={tab === 'quotes'} onClick={() => setTab('quotes')}>Devis ({quotes.length})</button>
        <button className="chip" aria-pressed={tab === 'apps'} onClick={() => setTab('apps')}>Candidatures ({apps.length})</button>
        <button className="chip" aria-pressed={tab === 'jobs'} onClick={() => setTab('jobs')}>Offres ({jobs.length})</button>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="card tbl-wrap" style={{ marginTop: 18 }}>
        {tab === 'quotes' && (
          <table className="tbl"><thead><tr><th>Réf.</th><th>Date</th><th>Client</th><th>Services</th><th>Projet</th><th>Statut</th></tr></thead><tbody>
            {quotes.map((q) => (
              <tr key={q.id}><td><span className="tag g">{q.ref}</span></td><td>{fmt(q.createdAt)}</td>
                <td><b>{q.name}</b><br />{q.org}<br />{q.contact}</td><td>{names(q.services)}<br /><small>{q.deadline}</small></td><td style={{ maxWidth: 320 }}>{q.message}</td>
                <td><select value={q.status} onChange={(e) => api.setStatus(q.id, e.target.value as Status).then(load).catch(fail)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td></tr>
            ))}
            {!quotes.length && <tr><td colSpan={6}>Aucune demande pour l’instant.</td></tr>}
          </tbody></table>
        )}
        {tab === 'apps' && (
          <table className="tbl"><thead><tr><th>Date</th><th>Poste</th><th>Candidat</th><th>Contact</th></tr></thead><tbody>
            {apps.map((a) => <tr key={a.id}><td>{fmt(a.createdAt)}</td><td>{a.job}</td><td>{a.name}</td><td>{a.contact}</td></tr>)}
            {!apps.length && <tr><td colSpan={4}>Aucune candidature pour l’instant.</td></tr>}
          </tbody></table>
        )}
        {tab === 'jobs' && (
          <>
            <form onSubmit={addJob} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, alignItems: 'end', marginBottom: 14 }}>
              <div><label htmlFor="jt">Poste</label><input id="jt" value={nj.title} onChange={(e) => setNj({ ...nj, title: e.target.value })} /></div>
              <div><label htmlFor="jg">Catégorie</label><input id="jg" value={nj.category} onChange={(e) => setNj({ ...nj, category: e.target.value })} /></div>
              <div><label htmlFor="jm">Contrat</label><input id="jm" value={nj.mode} onChange={(e) => setNj({ ...nj, mode: e.target.value })} /></div>
              <button className="btn" type="submit">Publier l’offre</button>
            </form>
            <table className="tbl"><thead><tr><th>Poste</th><th>Catégorie</th><th>Contrat</th><th /></tr></thead><tbody>
              {jobs.map((j) => <tr key={j.id}><td>{j.title}</td><td>{j.category}</td><td>{j.mode}</td>
                <td><button className="btn ghost" onClick={() => api.delJob(j.id).then(load).catch(fail)}>Supprimer</button></td></tr>)}
            </tbody></table>
          </>
        )}
      </div>
    </section>
  );
}

export default function Admin() {
  const [logged, setLogged] = useState(!!sessionStorage.getItem(TOKEN_KEY));
  return logged ? <Dashboard onLogout={() => setLogged(false)} /> : <Login onOk={() => setLogged(true)} />;
}
