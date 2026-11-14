import type { Application, Job, Quote } from '../../types';
import { SERVICES } from '../../data';

type Props = {
  quotes: Quote[];
  apps: Application[];
  jobs: Job[];
  onSelectTab: (tab: 'overview' | 'quotes' | 'apps' | 'jobs' | 'account') => void;
  onOpenQuote: (quote: Quote) => void;
};

const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const serviceName = (id: string) => SERVICES.find((s) => s.id === id)?.name ?? id;

export default function OverviewTab({ quotes, apps, jobs, onSelectTab, onOpenQuote }: Props) {
  const activeQuotes = quotes.filter((q) => !q.archived);
  const quotesNew = activeQuotes.filter((q) => q.status === 'nouveau').length;
  const quotesInProgress = activeQuotes.filter((q) => q.status === 'en cours').length;
  const quotesDone = activeQuotes.filter((q) => q.status === 'traité').length;
  const activeJobs = jobs.filter((j) => j.active !== false).length;

  const recentQuotes = [...activeQuotes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentApps = [...apps]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 18 }}>
      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
        }}
      >
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Total devis reçus</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{activeQuotes.length}</div>
        </div>
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderColor: quotesNew > 0 ? '#FF4D4F' : 'var(--line)',
            background: quotesNew > 0 ? 'color-mix(in srgb, #FF4D4F 8%, var(--surface))' : 'var(--surface)',
          }}
        >
          <div style={{ color: quotesNew > 0 ? '#E02424' : 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
            Devis nouveaux
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: quotesNew > 0 ? '#E02424' : 'inherit' }}>
            {quotesNew}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Devis en cours</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: 'var(--blue)' }}>{quotesInProgress}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Devis traités</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: 'var(--green)' }}>{quotesDone}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Candidatures</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{apps.length}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Offres actives</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{activeJobs}</div>
        </div>
      </div>

      {/* Listes récentes */}
      <div className="split" style={{ alignItems: 'stretch' }}>
        {/* 5 Derniers devis */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>Dernières demandes de devis</h3>
            <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onSelectTab('quotes')}>
              Voir tout
            </button>
          </div>
          {recentQuotes.length === 0 ? (
            <p style={{ color: 'var(--muted)', margin: 'auto 0' }}>Aucune demande enregistrée.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentQuotes.map((q) => (
                <div
                  key={q.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--line)',
                    background: 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="tag g" style={{ fontSize: 11, padding: '2px 8px' }}>
                        {q.ref}
                      </span>
                      <b>{q.name}</b>
                      {q.org && <span style={{ color: 'var(--muted)', fontSize: 12 }}>({q.org})</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                      {q.services.map(serviceName).join(', ')} · {fmt(q.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      className={`tag ${q.status === 'traité' ? 'g' : q.status === 'en cours' ? 'o' : ''}`}
                      style={{ fontSize: 11 }}
                    >
                      {q.status}
                    </span>
                    <button className="btn ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => onOpenQuote(q)}>
                      Détail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5 Dernières candidatures */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>Dernières candidatures</h3>
            <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onSelectTab('apps')}>
              Voir tout
            </button>
          </div>
          {recentApps.length === 0 ? (
            <p style={{ color: 'var(--muted)', margin: 'auto 0' }}>Aucune candidature enregistrée.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentApps.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--line)',
                    background: 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      Poste : <b>{a.job}</b> · Contact : {a.contact}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmt(a.createdAt)}</div>
                  </div>
                  <div>
                    <span
                      className={`tag ${a.status === 'retenu' ? 'g' : a.status === 'refusé' ? 'o' : ''}`}
                      style={{ fontSize: 11 }}
                    >
                      {a.status || 'nouveau'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

