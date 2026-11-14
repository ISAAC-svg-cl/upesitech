import { useState, type FormEvent } from 'react';
import { api } from '../../api';

type Props = {
  adminEmail?: string;
  onLogout: () => void;
};

export default function AccountTab({ adminEmail, onLogout }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setOk('');

    if (!currentPassword || !newPassword) {
      setErr('Veuillez renseigner le mot de passe actuel et le nouveau mot de passe.');
      return;
    }

    if (newPassword.length < 12) {
      setErr('Le nouveau mot de passe doit comporter au moins 12 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErr('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setBusy(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setOk('Votre mot de passe a été modifié avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (x) {
      setErr((x as Error).message || 'Échec de la modification du mot de passe.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 18, maxWidth: 540 }}>
      {/* Informations de compte */}
      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 17 }}>Session administrateur</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
          Connecté en tant que : <b>{adminEmail || 'admin@upesitech.com'}</b>
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          🔒 Déconnexion automatique activée après 30 minutes d'inactivité pour garantir la sécurité.
        </p>
        <div style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={onLogout} style={{ fontSize: 13, padding: '7px 16px' }}>
            Se déconnecter maintenant
          </button>
        </div>
      </div>

      {/* Formulaire de changement de mot de passe */}
      <div className="card">
        <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>Changer mon mot de passe</h3>

        {err && (
          <div className="err" role="alert" style={{ marginBottom: 10 }}>
            {err}
          </div>
        )}

        {ok && (
          <div className="ok on" role="status" style={{ marginBottom: 12 }}>
            {ok}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="cur-pw">Mot de passe actuel</label>
            <input
              id="cur-pw"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={busy}
              placeholder="••••••••••••"
            />
          </div>

          <div>
            <label htmlFor="new-pw">Nouveau mot de passe (min. 12 caractères)</label>
            <input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={busy}
              placeholder="Au moins 12 caractères"
            />
          </div>

          <div>
            <label htmlFor="conf-pw">Confirmer le nouveau mot de passe</label>
            <input
              id="conf-pw"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={busy}
              placeholder="Répétez le nouveau mot de passe"
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <button className="btn" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
              {busy ? 'Modification en cours…' : 'Mettre à jour mon mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
