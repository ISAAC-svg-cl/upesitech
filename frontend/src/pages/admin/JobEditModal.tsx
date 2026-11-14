import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api';
import type { Job } from '../../types';

type Props = {
  job: Job | null;
  onClose: () => void;
  onUpdated: () => void;
};

export default function JobEditModal({ job, onClose, onUpdated }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState('Temps plein');
  const [deadline, setDeadline] = useState('');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setCategory(job.category);
      setMode(job.mode || 'Temps plein');
      setDeadline(job.deadline || '');
      setActive(job.active !== false);
    }
  }, [job]);

  if (!job) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!job) return;
    if (!title.trim() || !category.trim()) {
      setErr('Le titre et la catégorie sont obligatoires.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await api.updateJob(job.id, {
        title: title.trim(),
        category: category.trim(),
        mode: mode.trim(),
        deadline: deadline.trim() || undefined,
        active,
      });
      onUpdated();
      onClose();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 15, 36, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Modifier l'offre d'emploi</h3>
          <button className="btn ghost" style={{ padding: '4px 10px' }} onClick={onClose}>
            ✕
          </button>
        </div>

        {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="edit-jt">Intitulé du poste *</label>
            <input
              id="edit-jt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              placeholder="ex: Développeur React / Node.js"
            />
          </div>

          <div>
            <label htmlFor="edit-jg">Catégorie *</label>
            <input
              id="edit-jg"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={busy}
              placeholder="ex: Développement, Sécurité, Design..."
            />
          </div>

          <div>
            <label htmlFor="edit-jm">Type de contrat</label>
            <input
              id="edit-jm"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={busy}
              placeholder="ex: Temps plein, Mission, Stage..."
            />
          </div>

          <div>
            <label htmlFor="edit-jd">Date limite de candidature (facultatif)</label>
            <input
              id="edit-jd"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={busy}
            />
            <small style={{ color: 'var(--muted)', fontSize: 12, display: 'block', marginTop: 4 }}>
              Au-delà de cette date, l'offre disparaît automatiquement de la page publique.
            </small>
          </div>

          <div style={{ marginTop: 6 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={busy}
                style={{ width: 'auto', margin: 0 }}
              />
              Offre active et visible en ligne (décocher pour mettre en pause)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <button className="btn ghost" type="button" onClick={onClose} disabled={busy}>
              Annuler
            </button>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
