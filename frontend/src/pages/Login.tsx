import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const { isLogged, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <input
            id="adm-pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
          <div className="err" role="alert">
            {err}
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </section>
  );
}

