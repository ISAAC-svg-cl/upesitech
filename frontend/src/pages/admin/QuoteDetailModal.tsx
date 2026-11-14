import { useState, type FormEvent } from 'react';
import { api } from '../../api';
import { SERVICES } from '../../data';
import type { Quote, Status } from '../../types';

type Props = {
  quote: Quote | null;
  onClose: () => void;
  onUpdated: () => void;
};

const STATUSES: Status[] = ['nouveau', 'en cours', 'traité'];
const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
const serviceName = (id: string) => SERVICES.find((s) => s.id === id)?.name ?? id;

function extractPhoneNumber(contact: string): string | null {
  // Supprime les espaces, points, parenthèses et tirets
  const cleaned = contact.replace(/[\s.()-]/g, '');
  // Vérifie si contient au moins 8 chiffres
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length >= 8) {
    // Si commence par 0, peut être un numéro local congolais (ex: 0812345678 -> 243812345678)
    if (cleaned.startsWith('0')) {
      return '243' + cleaned.slice(1);
    }
    if (cleaned.startsWith('+')) {
      return cleaned.slice(1);
    }
    return cleaned;
  }
  return null;
}

function extractEmail(contact: string): string | null {
  const match = contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

export default function QuoteDetailModal({ quote, onClose, onUpdated }: Props) {
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!quote) return null;

  const phone = extractPhoneNumber(quote.contact);
  const email = extractEmail(quote.contact);

  const emailSubject = encodeURIComponent(`Re: Demande de devis ${quote.ref} – UpesiTech`);
  const emailBody = encodeURIComponent(
    `Bonjour ${quote.name},\n\nNous faisons suite à votre demande de devis (${quote.ref}) concernant les services suivants :\n${quote.services.map(serviceName).join(', ')}.\n\nNous restons à votre entière disposition pour échanger sur votre projet.\n\nCordialement,\nL'équipe UpesiTech SARL`
  );
  const mailtoLink = email ? `mailto:${email}?subject=${emailSubject}&body=${emailBody}` : null;

  const waMessage = encodeURIComponent(
    `Bonjour ${quote.name}, nous avons bien reçu votre demande de devis ${quote.ref} sur UpesiTech et souhaitons échanger avec vous.`
  );
  const waLink = phone ? `https://wa.me/${phone}?text=${waMessage}` : null;

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!quote || !noteText.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await api.addQuoteNote(quote.id, noteText.trim());
      setNoteText('');
      onUpdated();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(newStatus: Status) {
    if (!quote) return;
    try {
      await api.setStatus(quote.id, newStatus);
      onUpdated();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  async function handleToggleArchive() {
    if (!quote) return;
    try {
      await api.archiveQuote(quote.id, !quote.archived);
      onUpdated();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  async function handleDelete() {
    if (!quote) return;
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le devis ${quote.ref} ?`)) return;
    try {
      await api.deleteQuote(quote.id);
      onUpdated();
      onClose();
    } catch (x) {
      setErr((x as Error).message);
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
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 640,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header de la modale */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="tag g" style={{ fontSize: 13, fontWeight: 800 }}>
                {quote.ref}
              </span>
              {quote.archived && <span className="tag o">Archivé</span>}
              <h3 style={{ margin: 0, fontSize: 20 }}>{quote.name}</h3>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Créé le {fmt(quote.createdAt)}
            </div>
          </div>
          <button className="btn ghost" style={{ padding: '6px 12px' }} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}

        {/* Coordonnées & Statut */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
          <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Organisation</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{quote.org || 'Particulier'}</div>
          </div>
          <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Contact</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{quote.contact}</div>
          </div>
          <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Délai souhaité</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{quote.deadline || 'Non précisé'}</div>
          </div>
          <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Statut</div>
            <select
              style={{ marginTop: 4, width: '100%', padding: '6px 10px', borderRadius: 8 }}
              value={quote.status}
              onChange={(e) => handleStatusChange(e.target.value as Status)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions de communication rapide */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          {mailtoLink && (
            <a className="btn" href={mailtoLink} target="_blank" rel="noreferrer" style={{ fontSize: 13, padding: '8px 16px' }}>
              ✉️ Répondre par e-mail
            </a>
          )}
          {waLink && (
            <a
              className="btn"
              href={waLink}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, padding: '8px 16px', background: '#25D366' }}
            >
              💬 Écrire sur WhatsApp
            </a>
          )}
          <button className="btn ghost" onClick={handleToggleArchive} style={{ fontSize: 13, padding: '8px 16px' }}>
            {quote.archived ? 'Désarchiver' : 'Archiver'}
          </button>
          <button
            className="btn ghost"
            onClick={handleDelete}
            style={{ fontSize: 13, padding: '8px 16px', color: '#E02424', borderColor: '#E02424' }}
          >
            Supprimer
          </button>
        </div>

        {/* Services demandés */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
            Services demandés ({quote.services.length})
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {quote.services.map((s) => (
              <span key={s} className="tag" style={{ fontSize: 12 }}>
                {serviceName(s)}
              </span>
            ))}
          </div>
        </div>

        {/* Message du client */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
            Description du projet
          </div>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--bg)',
              whiteSpace: 'pre-wrap',
              fontSize: 14,
              lineHeight: 1.5,
              border: '1px solid var(--line)',
            }}
          >
            {quote.message}
          </div>
        </div>

        {/* Notes internes */}
        <div style={{ marginTop: 22, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
            Notes internes <small style={{ fontWeight: 400, color: 'var(--muted)' }}>(visibles uniquement par l'admin)</small>
          </div>

          <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Ajouter une note de suivi..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              disabled={busy}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13 }}
            />
            <button className="btn" type="submit" disabled={busy || !noteText.trim()} style={{ fontSize: 13, padding: '8px 16px' }}>
              Ajouter
            </button>
          </form>

          {quote.notes && quote.notes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quote.notes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'var(--bg)',
                    fontSize: 13,
                    borderLeft: '3px solid var(--blue)',
                  }}
                >
                  <div>{n.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{fmt(n.createdAt)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Aucune note interne pour ce devis.</div>
          )}
        </div>
      </div>
    </div>
  );
}

