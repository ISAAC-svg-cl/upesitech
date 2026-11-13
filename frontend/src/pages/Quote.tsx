import { useState, type ChangeEvent, type FormEvent } from 'react';
import Banner from '../components/Banner';
import { api } from '../api';
import { useCart } from '../cart';
import { DEADLINES, SERVICES } from '../data';

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
const EMPTY = { name: '', org: '', contact: '', deadline: DEADLINES[1], message: '' };
const STEPS: [string, string][] = [['Analyse', 'Nous cernons vos attentes.'], ['Conception', 'Maquettes et spécifications validées avec vous.'], ['Réalisation', 'Développement, design ou impression.'], ['Tests et livraison', 'Contrôle qualité puis mise en production.'], ['Formation et suivi', 'Assistance, maintenance et évolutions.']];

export default function Quote() {
  const { sel, toggle, clear } = useCart();
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<{ ref: string; names: string }[]>([]);
  const bind = (k: keyof typeof EMPTY) => ({ value: f[k], onChange: (e: ChangeEvent<Field>) => setF({ ...f, [k]: e.target.value }) });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setOk('');
    if (!sel.length) return setErr('Choisissez au moins un service.');
    if (!f.name.trim() || !f.contact.trim() || !f.message.trim()) return setErr('Renseignez votre nom, un moyen de vous joindre et la description du projet.');
    setErr(''); setBusy(true);
    try {
      const { ref } = await api.sendQuote({ ...f, services: sel });
      setOk(`Demande ${ref} envoyée. Merci ${f.name.trim()}, nous revenons vers vous rapidement.`);
      setMine((m) => [{ ref, names: sel.map((id) => SERVICES.find((s) => s.id === id)?.name).join(', ') }, ...m]);
      setF(EMPTY); clear();
    } catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="view on">
      <Banner variant="s2" title="Demander un devis">Choisissez vos services, décrivez votre projet, nous vous répondons.</Banner>
      <div className="split">
        <div className="card">
          <form onSubmit={submit} noValidate>
            <label>Services souhaités</label>
            <div className="chips">{SERVICES.map((s) => <button type="button" key={s.id} className="chip" aria-pressed={sel.includes(s.id)} onClick={() => toggle(s.id)}>{s.name}</button>)}</div>
            <label htmlFor="nm">Nom complet</label><input id="nm" autoComplete="name" {...bind('name')} />
            <label htmlFor="org">Entreprise ou organisation (facultatif)</label><input id="org" autoComplete="organization" {...bind('org')} />
            <label htmlFor="ct">Téléphone ou e-mail</label><input id="ct" autoComplete="tel" {...bind('contact')} />
            <label htmlFor="dl">Délai souhaité</label>
            <select id="dl" {...bind('deadline')}>{DEADLINES.map((d) => <option key={d}>{d}</option>)}</select>
            <label htmlFor="msg">Votre projet</label>
            <textarea id="msg" placeholder="Ex. : site web pour mon cabinet, 200 cartes de visite, audit de sécurité…" {...bind('message')} />
            <div className="err" role="alert">{err}</div>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer ma demande'}</button>
            {ok && <div className="ok on" role="status">{ok}</div>}
          </form>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Comment ça se passe</h3>
          <ol className="steps">{STEPS.map(([b, s]) => <li key={b}><b>{b}</b>{s}</li>)}</ol>
          <h3>Mes demandes</h3>
          {mine.length ? mine.map((m) => <div key={m.ref} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}><span className="tag g">{m.ref}</span> {m.names}</div>)
            : <div style={{ color: 'var(--muted)', fontSize: 14 }}>Aucune demande envoyée pour l’instant.</div>}
        </div>
      </div>
    </section>
  );
}
