import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const { isLogged, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLogged) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErr('Veuillez renseigner votre e-mail et votre mot de passe.');
      return;
    }
    setBusy(true);
    try {
      await login({ email: trimmedEmail, password });
      navigate('/admin', { replace: true });
    } catch (x) {
      const error = x as Error;
      setErr(error.message || 'Identifiants incorrects.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="view on" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>Connexion administrateur</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="adm-email">Adresse e-mail</label>
          <input
            id="adm-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            placeholder="admin@upesitech.com"
          />
          <label htmlFor="adm-pw">Mot de passe</label>
          <div style={{ position: 'relative' }}>
            <input
              id="adm-pw"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: 'var(--muted)', display: 'flex', alignItems: 'center',
              }}
            >
              {showPw ? (
                /* Œil barré */
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                /* Œil ouvert */
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {err && <div className="err" role="alert" style={{ marginTop: 8 }}>{err}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
            {busy ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </section>
  );
}

