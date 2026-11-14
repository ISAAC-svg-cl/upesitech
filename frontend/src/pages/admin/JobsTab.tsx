import { useState, type FormEvent } from 'react';
import { api } from '../../api';
import type { Application, Job } from '../../types';
import JobEditModal from './JobEditModal';

type Props = {
  jobs: Job[];
  apps: Application[];
  onReload: () => void;
  onError: (err: unknown) => void;
};

export default function JobsTab({ jobs, apps, onReload, onError }: Props) {
  const [nj, setNj] = useState({ title: '', category: '', mode: 'Temps plein', deadline: '' });
  const [busy, setBusy] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  async function handleAddJob(e: FormEvent) {
    e.preventDefault();
    if (!nj.title.trim() || !nj.category.trim()) {
      onError(new Error('Titre et catégorie obligatoires.'));
      return;
    }
    setBusy(true);
    try {
      await api.addJob({
        title: nj.title.trim(),
        category: nj.category.trim(),
        mode: nj.mode.trim() || 'Temps plein',
        deadline: nj.deadline.trim() || undefined,
      });
      setNj({ title: '', category: '', mode: 'Temps plein', deadline: '' });
      onReload();
    } catch (x) {
      onError(x);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(j: Job) {
    try {
      await api.updateJob(j.id, { active: j.active === false });
      onReload();
    } catch (x) {
      onError(x);
    }
  }

  async function handleDelete(j: Job) {
    if (!window.confirm(`Supprimer définitivement l'offre "${j.title}" ?`)) return;
    try {
      await api.delJob(j.id);
      onReload();
    } catch (x) {
      onError(x);
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      {/* Formulaire de publication */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>Publier une nouvelle offre</h3>
        <form
          onSubmit={handleAddJob}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label htmlFor="jt" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Poste *
            </label>
            <input
              id="jt"
              placeholder="ex: Développeur web"
              value={nj.title}
              onChange={(e) => setNj({ ...nj, title: e.target.value })}
              disabled={busy}
              style={{ fontSize: 13, padding: '7px 10px' }}
            />
          </div>
          <div>
            <label htmlFor="jg" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Catégorie *
            </label>
            <input
              id="jg"
              placeholder="ex: Développement"
              value={nj.category}
              onChange={(e) => setNj({ ...nj, category: e.target.value })}
              disabled={busy}
              style={{ fontSize: 13, padding: '7px 10px' }}
            />
          </div>
          <div>
            <label htmlFor="jm" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Contrat
            </label>
            <input
              id="jm"
              placeholder="ex: Temps plein"
              value={nj.mode}
              onChange={(e) => setNj({ ...nj, mode: e.target.value })}
              disabled={busy}
              style={{ fontSize: 13, padding: '7px 10px' }}
            />
          </div>
          <div>
            <label htmlFor="jd" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Date limite (facultatif)
            </label>
            <input
              id="jd"
              type="date"
              value={nj.deadline}
              onChange={(e) => setNj({ ...nj, deadline: e.target.value })}
              disabled={busy}
              style={{ fontSize: 13, padding: '7px 10px' }}
            />
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ fontSize: 13, padding: '9px 18px' }}>
            {busy ? 'Publication…' : 'Publier l’offre'}
          </button>
        </form>
      </div>

      {/* Tableau des offres */}
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Poste</th>
              <th>Catégorie</th>
              <th>Contrat</th>
              <th>Date limite</th>
              <th>Statut</th>
              <th>Candidatures</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const appsCount = apps.filter((a) => a.job.toLowerCase() === j.title.toLowerCase()).length;
              const isActive = j.active !== false;

              return (
                <tr key={j.id}>
                  <td>
                    <b>{j.title}</b>
                  </td>
                  <td>{j.category}</td>
                  <td>{j.mode}</td>
                  <td style={{ fontSize: 13 }}>
                    {j.deadline ? (
                      <span>{new Date(j.deadline).toLocaleDateString('fr-FR')}</span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>Illimitée</span>
                    )}
                  </td>
                  <td>
                    <span className={`tag ${isActive ? 'g' : 'o'}`} style={{ fontSize: 11 }}>
                      {isActive ? 'Active' : 'En pause'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: appsCount > 0 ? 800 : 400,
                        color: appsCount > 0 ? 'var(--blue)' : 'var(--muted)',
                      }}
                    >
                      {appsCount} reçu{appsCount > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        className="btn ghost"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => handleToggleActive(j)}
                      >
                        {isActive ? 'Mettre en pause' : 'Réactiver'}
                      </button>
                      <button
                        className="btn ghost"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => setEditingJob(j)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn ghost"
                        style={{ padding: '5px 8px', fontSize: 12, color: '#E02424' }}
                        title="Supprimer"
                        onClick={() => handleDelete(j)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)' }}>
                  Aucune offre publiée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'édition */}
      {editingJob && <JobEditModal job={editingJob} onClose={() => setEditingJob(null)} onUpdated={onReload} />}
    </div>
  );
}

