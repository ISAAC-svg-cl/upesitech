import { useMemo, useState, type FormEvent } from 'react';
import { api } from '../../api';
import type { AppStatus, Application } from '../../types';
import { exportToCsv } from './csv';

type Props = {
  apps: Application[];
  onReload: () => void;
  onError: (err: unknown) => void;
};

const APP_STATUSES: AppStatus[] = ['nouveau', 'à rappeler', 'entretien', 'retenu', 'refusé'];
const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

export default function ApplicationsTab({ apps, onReload, onError }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [noteText, setNoteText] = useState('');
  const [busyNote, setBusyNote] = useState(false);

  // Liste unique des postes ayant des candidatures
  const jobTitles = useMemo(() => {
    return Array.from(new Set(apps.map((a) => a.job))).filter(Boolean);
  }, [apps]);

  // Filtrage
  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (statusFilter !== 'all' && (a.status || 'nouveau') !== statusFilter) return false;
      if (jobFilter !== 'all' && a.job !== jobFilter) return false;
      if (q) {
        const inName = a.name.toLowerCase().includes(q);
        const inContact = a.contact.toLowerCase().includes(q);
        const inJob = a.job.toLowerCase().includes(q);
        if (!inName && !inContact && !inJob) return false;
      }
      return true;
    });
  }, [apps, search, statusFilter, jobFilter]);

  function handleExportCsv() {
    const headers = ['Date', 'Poste visé', 'Nom du candidat', 'Contact', 'Statut', 'Notes internes'];
    const rows = filteredApps.map((a) => [
      fmt(a.createdAt),
      a.job,
      a.name,
      a.contact,
      a.status || 'nouveau',
      (a.notes || []).map((n) => `[${fmt(n.createdAt)}] ${n.text}`).join(' | '),
    ]);
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`upesitech-candidatures-${dateStr}`, headers, rows);
  }

  async function handleStatusChange(id: string, status: AppStatus) {
    try {
      await api.setAppStatus(id, status);
      onReload();
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp({ ...selectedApp, status });
      }
    } catch (x) {
      onError(x);
    }
  }

  async function handleDelete(a: Application) {
    if (!window.confirm(`Supprimer définitivement la candidature de ${a.name} pour le poste "${a.job}" ?`)) return;
    try {
      await api.deleteApp(a.id);
      if (selectedApp?.id === a.id) setSelectedApp(null);
      onReload();
    } catch (x) {
      onError(x);
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!selectedApp || !noteText.trim()) return;
    setBusyNote(true);
    try {
      const note = await api.addAppNote(selectedApp.id, noteText.trim());
      setNoteText('');
      const updatedNotes = [note, ...(selectedApp.notes || [])];
      setSelectedApp({ ...selectedApp, notes: updatedNotes });
      onReload();
    } catch (x) {
      onError(x);
    } finally {
      setBusyNote(false);
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      {/* Filtres & Recherche */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label htmlFor="search-apps" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Recherche
            </label>
            <input
              id="search-apps"
              type="search"
              placeholder="Nom, poste, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 13, padding: '7px 10px' }}
            />
          </div>

          <div>
            <label htmlFor="filter-app-job" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Poste
            </label>
            <select
              id="filter-app-job"
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              style={{ fontSize: 13, padding: '7px 10px' }}
            >
              <option value="all">Tous les postes ({apps.length})</option>
              {jobTitles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-app-status" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Statut
            </label>
            <select
              id="filter-app-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: 13, padding: '7px 10px' }}
            >
              <option value="all">Tous les statuts</option>
              {APP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--line)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {filteredApps.length} candidature{filteredApps.length > 1 ? 's' : ''}
          </span>
          <button
            className="btn ghost"
            onClick={handleExportCsv}
            disabled={filteredApps.length === 0}
            style={{ padding: '6px 14px', fontSize: 12 }}
          >
            📥 Exporter CSV (Excel)
          </button>
        </div>
      </div>

      {/* Tableau des candidatures */}
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Poste</th>
              <th>Candidat</th>
              <th>Contact</th>
              <th>Statut</th>
              <th>Notes</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map((a) => (
              <tr key={a.id}>
                <td style={{ fontSize: 13 }}>{fmt(a.createdAt)}</td>
                <td>
                  <b>{a.job}</b>
                </td>
                <td>{a.name}</td>
                <td>{a.contact}</td>
                <td>
                  <select
                    value={a.status || 'nouveau'}
                    onChange={(e) => handleStatusChange(a.id, e.target.value as AppStatus)}
                    style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6 }}
                  >
                    {APP_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="btn ghost"
                    style={{ padding: '4px 8px', fontSize: 12 }}
                    onClick={() => setSelectedApp(a)}
                  >
                    📝 {a.notes?.length || 0} note(s)
                  </button>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn ghost"
                    style={{ padding: '4px 8px', fontSize: 12, color: '#E02424' }}
                    title="Supprimer"
                    onClick={() => handleDelete(a)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {filteredApps.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)' }}>
                  Aucune candidature trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Notes Candidature */}
      {selectedApp && (
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
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Notes de suivi : {selectedApp.name}</h3>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Poste : {selectedApp.job}</div>
              </div>
              <button className="btn ghost" style={{ padding: '4px 10px' }} onClick={() => setSelectedApp(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                type="text"
                placeholder="Ajouter une observation, retour d'entretien..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                disabled={busyNote}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
              />
              <button className="btn" type="submit" disabled={busyNote || !noteText.trim()} style={{ fontSize: 13, padding: '8px 16px' }}>
                Ajouter
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedApp.notes && selectedApp.notes.length > 0 ? (
                selectedApp.notes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'var(--bg)',
                      borderLeft: '3px solid var(--blue)',
                      fontSize: 13,
                    }}
                  >
                    <div>{n.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{fmt(n.createdAt)}</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Aucune note interne pour ce candidat.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

