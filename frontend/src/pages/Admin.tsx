import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Application, Job, Quote } from '../types';
import AccountTab from './admin/AccountTab';
import ApplicationsTab from './admin/ApplicationsTab';
import JobsTab from './admin/JobsTab';
import OverviewTab from './admin/OverviewTab';
import QuoteDetailModal from './admin/QuoteDetailModal';
import QuotesTab from './admin/QuotesTab';

type TabKey = 'overview' | 'quotes' | 'apps' | 'jobs' | 'account';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function Admin() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('overview');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/connexion', { replace: true });
  }, [logout, navigate]);

  // Déconnexion automatique après 30 minutes d'inactivité
  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const onUserAction = () => resetInactivityTimer();

    events.forEach((ev) => window.addEventListener(ev, onUserAction, { passive: true }));
    resetInactivityTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onUserAction));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetInactivityTimer]);

  const fail = useCallback(
    (x: unknown) => {
      const e = x as Error & { status?: number };
      if (e.status === 401) {
        handleLogout();
      } else if (e.status === 404) {
        // Ressource introuvable (ex : devis supprimé entre-temps) : on ignore silencieusement
        setSelectedQuote(null);
      } else {
        setErr(e.message || 'Une erreur est survenue.');
      }
    },
    [handleLogout],
  );

  const loadData = useCallback(() => {
    setErr('');
    Promise.all([api.quotes(), api.applications(), api.adminJobs(), api.me()])
      .then(([q, a, j, me]) => {
        setQuotes(q);
        setApps(a);
        setJobs(j);
        if (me.email) setAdminEmail(me.email);
        // Si un devis est ouvert en modale, le rafraîchir avec les dernières données
        // S'il n'existe plus (supprimé ou DB réinitialisée), fermer la modale sans erreur
        setSelectedQuote((current) => (current ? q.find((item) => item.id === current.id) ?? null : null));
      })
      .catch(fail)
      .finally(() => setLoading(false));
  }, [fail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Nombre de devis non archivés et au statut "nouveau"
  const newQuotesCount = quotes.filter((q) => !q.archived && q.status === 'nouveau').length;

  return (
    <section className="view on">
      {/* En-tête du tableau de bord */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, letterSpacing: '-0.02em' }}>Tableau de bord administrateur</h2>
          {adminEmail && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              Session active : <b>{adminEmail}</b>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn ghost" style={{ fontSize: 13, padding: '7px 14px' }} onClick={loadData} title="Rafraîchir les données">
            🔄 Actualiser
          </button>
          <button className="btn ghost" style={{ fontSize: 13, padding: '7px 14px' }} onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Barre d'onglets */}
      <div className="filters" style={{ marginTop: 18 }}>
        <button className="chip" aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}>
          📊 Aperçu
        </button>

        <button className="chip" aria-pressed={tab === 'quotes'} onClick={() => setTab('quotes')}>
          <span>Devis ({quotes.filter((q) => !q.archived).length})</span>
          {newQuotesCount > 0 && (
            <span
              style={{
                marginLeft: 6,
                background: '#E02424',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 999,
                display: 'inline-block',
                lineHeight: 1,
              }}
              title={`${newQuotesCount} nouvelle(s) demande(s) de devis`}
            >
              {newQuotesCount}
            </span>
          )}
        </button>

        <button className="chip" aria-pressed={tab === 'apps'} onClick={() => setTab('apps')}>
          💼 Candidatures ({apps.length})
        </button>

        <button className="chip" aria-pressed={tab === 'jobs'} onClick={() => setTab('jobs')}>
          📢 Offres ({jobs.length})
        </button>

        <button className="chip" aria-pressed={tab === 'account'} onClick={() => setTab('account')}>
          ⚙️ Mon compte
        </button>
      </div>

      {/* Bannière d'erreur */}
      {err && (
        <div className="err" role="alert" style={{ marginTop: 14 }}>
          {err}
        </div>
      )}

      {/* Chargement */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', marginTop: 18, color: 'var(--muted)' }}>
          Chargement du tableau de bord…
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <OverviewTab
              quotes={quotes}
              apps={apps}
              jobs={jobs}
              onSelectTab={(newTab) => setTab(newTab)}
              onOpenQuote={(q) => setSelectedQuote(q)}
            />
          )}

          {tab === 'quotes' && (
            <QuotesTab
              quotes={quotes}
              onReload={loadData}
              onOpenQuote={(q) => setSelectedQuote(q)}
              onError={fail}
            />
          )}

          {tab === 'apps' && (
            <ApplicationsTab
              apps={apps}
              onReload={loadData}
              onError={fail}
            />
          )}

          {tab === 'jobs' && (
            <JobsTab
              jobs={jobs}
              apps={apps}
              onReload={loadData}
              onError={fail}
            />
          )}

          {tab === 'account' && (
            <AccountTab
              adminEmail={adminEmail}
              onLogout={handleLogout}
            />
          )}
        </>
      )}

      {/* Modale de détail d'un devis */}
      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onUpdated={loadData}
        />
      )}
    </section>
  );
}
