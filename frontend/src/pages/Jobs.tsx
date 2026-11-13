import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Banner from '../components/Banner';
import { api } from '../api';
import type { Job } from '../types';

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [state, setState] = useState<'load' | 'ok' | 'err'>('load');
  const [cat, setCat] = useState('Tous');
  const [target, setTarget] = useState<Job | null>(null);
  const [f, setF] = useState({ name: '', contact: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => { api.jobs().then((j) => { setJobs(j); setState('ok'); }).catch(() => setState('err')); }, []);
  const cats = useMemo(() => ['Tous', ...new Set(jobs.map((j) => j.category))], [jobs]);
  const shown = jobs.filter((j) => cat === 'Tous' || j.category === cat);

  function open(j: Job) { setTarget(j); setMsg(null); dlg.current?.showModal(); }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !f.contact.trim()) return setMsg({ ok: false, text: 'Renseignez votre nom et un moyen de vous joindre.' });
    try {
      await api.apply({ job: target!.title, ...f });
      setMsg({ ok: true, text: 'Candidature envoyée. Nous vous contacterons si votre profil correspond.' });
      setF({ name: '', contact: '' });
    } catch (x) { setMsg({ ok: false, text: (x as Error).message }); }
  }

  return (
    <section className="view on">
      <Banner variant="jobs" title="Rejoignez UpesiTech">Les offres d’emploi sont publiées chaque samedi. Voici les profils que nous recrutons régulièrement.</Banner>
      <div className="filters">{cats.map((c) => <button key={c} className="chip" aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="list">
        {state === 'load' && <p style={{ color: 'var(--muted)' }}>Chargement des offres…</p>}
        {state === 'err' && <p className="err">Impossible de charger les offres. Vérifiez que le serveur est démarré.</p>}
        {state === 'ok' && !shown.length && <p style={{ color: 'var(--muted)' }}>Aucune offre pour le moment. Revenez samedi.</p>}
        {shown.map((j) => (
          <div className="card job" key={j.id}>
            <div><h3>{j.title}</h3><p><span className="tag">{j.category}</span> <span className="tag o">{j.mode}</span></p></div>
            <button className="btn" onClick={() => open(j)}>Postuler</button>
          </div>
        ))}
      </div>
      <dialog ref={dlg}>
        <form onSubmit={send} noValidate>
          <h3 style={{ marginTop: 0 }}>Postuler : {target?.title}</h3>
          <label htmlFor="jn">Nom complet</label><input id="jn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <label htmlFor="jc">Téléphone ou e-mail</label><input id="jc" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />
          {msg && (msg.ok ? <div className="ok on" role="status">{msg.text}</div> : <div className="err" role="alert">{msg.text}</div>)}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn" type="submit">Envoyer ma candidature</button>
            <button className="btn ghost" type="button" onClick={() => dlg.current?.close()}>Fermer</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
