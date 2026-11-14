import { useMemo, useState } from 'react';
import { api } from '../../api';
import { SERVICES } from '../../data';
import type { Quote, Status } from '../../types';
import { exportToCsv } from './csv';
import { exportQuotesListPdf } from './pdf';

type Props = {
  quotes: Quote[];
  onReload: () => void;
  onOpenQuote: (quote: Quote) => void;
  onError: (err: unknown) => void;
};

const STATUSES: Status[] = ['nouveau', 'en cours', 'traité'];
const PAGE_SIZE = 20;

const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const serviceName = (id: string) => SERVICES.find((s) => s.id === id)?.name ?? id;

export default function QuotesTab({ quotes, onReload, onOpenQuote, onError }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);

  // Filtrage et tri
  const filteredQuotes = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    const now = new Date();

    return quotes
      .filter((q) => {
        // Filtre archive
        if (showArchived) {
          if (!q.archived) return false;
        } else {
          if (q.archived) return false;
        }

        // Filtre statut
        if (statusFilter !== 'all' && q.status !== statusFilter) return false;

        // Filtre service
        if (serviceFilter !== 'all' && !q.services.includes(serviceFilter)) return false;

        // Filtre période
        if (periodFilter !== 'all') {
          const qDate = new Date(q.createdAt);
          const diffDays = (now.getTime() - qDate.getTime()) / (1000 * 3600 * 24);
          if (periodFilter === '7d' && diffDays > 7) return false;
          if (periodFilter === '30d' && diffDays > 30) return false;
          if (periodFilter === 'month') {
            if (qDate.getMonth() !== now.getMonth() || qDate.getFullYear() !== now.getFullYear()) return false;
          }
        }

        // Recherche textuelle
        if (qLower) {
          const inRef = q.ref.toLowerCase().includes(qLower);
          const inName = q.name.toLowerCase().includes(qLower);
          const inOrg = (q.org || '').toLowerCase().includes(qLower);
          const inContact = q.contact.toLowerCase().includes(qLower);
          const inMsg = q.message.toLowerCase().includes(qLower);
          if (!inRef && !inName && !inOrg && !inContact && !inMsg) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [quotes, search, statusFilter, serviceFilter, periodFilter, showArchived, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredQuotes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedQuotes = filteredQuotes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleExportCsv() {
    const headers = [
      'Référence',
      'Date de création',
      'Nom du client',
      'Organisation',
      'Contact',
      'Délai souhaité',
      'Services demandés',
      'Statut',
      'Archivé',
      'Message / Projet',
      'Notes internes',
    ];

    const rows = filteredQuotes.map((q) => [
      q.ref,
      fmt(q.createdAt),
      q.name,
      q.org || '',
      q.contact,
      q.deadline || '',
      q.services.map(serviceName).join(', '),
      q.status,
      q.archived ? 'Oui' : 'Non',
      q.message,
      (q.notes || []).map((n) => `[${fmt(n.createdAt)}] ${n.text}`).join(' | '),
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`upesitech-devis-${dateStr}`, headers, rows);
  }

  function handleExportPdf() {
    let subtitle = 'Tous les devis';
    if (statusFilter !== 'all') subtitle = `Statut : ${statusFilter}`;
    if (serviceFilter !== 'all') subtitle += ` · Service : ${serviceName(serviceFilter)}`;
    if (showArchived) subtitle += ' (Archivés)';
    exportQuotesListPdf(filteredQuotes, subtitle);
  }

  async function handleStatusChange(id: string, s: Status) {
    try {
      await api.setStatus(id, s);
      onReload();
    } catch (x) {
      onError(x);
    }
  }

  async function handleToggleArchive(id: string, currentArchived?: boolean) {
    try {
      await api.archiveQuote(id, !currentArchived);
      onReload();
    } catch (x) {
      onError(x);
    }
  }

  async function handleDelete(q: Quote) {
    if (!window.confirm(`Supprimer définitivement la demande ${q.ref} de ${q.name} ?`)) return;
    try {
      await api.deleteQuote(q.id);
      onReload();
    } catch (x) {
      onError(x);
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      {/* Barre de contrôles et filtres */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Recherche */}
          <div>
            <label htmlFor="search-quote" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Recherche
            </label>
            <input
              id="search-quote"
              type="search"
              placeholder="Nom, entreprise, réf, contact..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: 13, padding: '7px 10px' }}
            />
          </div>

          {/* Filtre statut */}
          <div>
            <label htmlFor="filter-status" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Statut
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: 13, padding: '7px 10px' }}
            >
              <option value="all">Tous les statuts</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre service */}
          <div>
            <label htmlFor="filter-service" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Service
            </label>
            <select
              id="filter-service"
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: 13, padding: '7px 10px' }}
            >
              <option value="all">Tous les services</option>
              {SERVICES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre période */}
          <div>
            <label htmlFor="filter-period" style={{ margin: '0 0 4px', fontSize: 12 }}>
              Période
            </label>
            <select
              id="filter-period"
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: 13, padding: '7px 10px' }}
            >
              <option value="all">Toutes les dates</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="month">Ce mois-ci</option>
            </select>
          </div>
        </div>

        {/* Ligne d'actions secondaires : Tri, Archivés, Export */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => {
                  setShowArchived(e.target.checked);
                  setPage(1);
                }}
                style={{ width: 'auto', margin: 0 }}
              />
              Afficher les devis archivés
            </label>

            <button
              className="btn ghost"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              Tri : {sortOrder === 'desc' ? 'Plus récents d’abord ↓' : 'Plus anciens d’abord ↑'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {filteredQuotes.length} résultat{filteredQuotes.length > 1 ? 's' : ''}
            </span>
            <button
              className="btn"
              onClick={handleExportPdf}
              disabled={filteredQuotes.length === 0}
              style={{ padding: '6px 14px', fontSize: 12 }}
              title="Télécharger la liste complète au format PDF"
            >
              📄 Exporter en PDF
            </button>
            <button
              className="btn ghost"
              onClick={handleExportCsv}
              disabled={filteredQuotes.length === 0}
              style={{ padding: '6px 14px', fontSize: 12 }}
              title="Exporter au format tableur CSV"
            >
              📥 CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des devis */}
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Réf.</th>
              <th>Date</th>
              <th>Client</th>
              <th>Services</th>
              <th>Projet</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedQuotes.map((q) => (
              <tr key={q.id}>
                <td>
                  <span className="tag g">{q.ref}</span>
                  {q.archived && (
                    <span className="tag o" style={{ display: 'block', marginTop: 4, fontSize: 10 }}>
                      Archivé
                    </span>
                  )}
                  {q.notes && q.notes.length > 0 && (
                    <span
                      title={`${q.notes.length} note(s) interne(s)`}
                      style={{
                        display: 'inline-block',
                        fontSize: 11,
                        color: 'var(--blue)',
                        marginTop: 4,
                        cursor: 'pointer',
                      }}
                      onClick={() => onOpenQuote(q)}
                    >
                      📝 {q.notes.length}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: 13 }}>{fmt(q.createdAt)}</td>
                <td>
                  <b>{q.name}</b>
                  {q.org && (
                    <>
                      <br />
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{q.org}</span>
                    </>
                  )}
                  <br />
                  <small style={{ color: 'var(--muted)' }}>{q.contact}</small>
                </td>
                <td style={{ fontSize: 12.5 }}>
                  {q.services.map(serviceName).join(', ')}
                  <br />
                  <small style={{ color: 'var(--muted)' }}>Délai : {q.deadline || 'Non précisé'}</small>
                </td>
                <td style={{ maxWidth: 280, fontSize: 13, lineHeight: 1.4 }}>
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {q.message}
                  </div>
                </td>
                <td>
                  <select
                    value={q.status}
                    onChange={(e) => handleStatusChange(q.id, e.target.value as Status)}
                    style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6 }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => onOpenQuote(q)}>
                      Détail
                    </button>
                    <button
                      className="btn ghost"
                      style={{ padding: '5px 8px', fontSize: 12 }}
                      title={q.archived ? 'Désarchiver' : 'Archiver'}
                      onClick={() => handleToggleArchive(q.id, q.archived)}
                    >
                      {q.archived ? '📂' : '📁'}
                    </button>
                    <button
                      className="btn ghost"
                      style={{ padding: '5px 8px', fontSize: 12, color: '#E02424' }}
                      title="Supprimer"
                      onClick={() => handleDelete(q)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pagedQuotes.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)' }}>
                  Aucun devis correspondant aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <button
            className="btn ghost"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ fontSize: 13, padding: '6px 14px' }}
          >
            ← Précédent
          </button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            Page <b>{currentPage}</b> sur <b>{totalPages}</b>
          </span>
          <button
            className="btn ghost"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{ fontSize: 13, padding: '6px 14px' }}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

