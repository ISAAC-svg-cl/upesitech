# UpesiTech – site web complet

- `frontend/` : React 18 + TypeScript + Vite + React Router
- `backend/`  : Node.js (Express, JavaScript) – API REST, authentification admin (JWT), notifications e-mail

## Démarrage (développement)

Prérequis : Node.js 20 ou plus.

```bash
# 1) API
cd backend
cp .env.example .env        # puis modifiez JWT_SECRET et ADMIN_PASSWORD
npm install
npm run dev                 # http://localhost:4000

# 2) Site (dans un autre terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173  (les appels /api sont redirigés vers :4000)
```

Espace admin : http://localhost:5173/admin (mot de passe = `ADMIN_PASSWORD`).

## Production (un seul serveur)

```bash
cd frontend && npm install && npm run build
cd ../backend && npm install && npm start
```
Si `frontend/dist` existe, l'API sert aussi le site sur le port 4000.
Si le front est hébergé ailleurs : définissez `VITE_API_URL` (URL de l'API) avant le build
et `CLIENT_ORIGIN` (URL du site) dans `backend/.env`.

## API

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/health` | public |
| GET | `/api/jobs` | public |
| POST | `/api/quotes` | public (limité) |
| POST | `/api/applications` | public (limité) |
| POST | `/api/admin/login` | public (limité) |
| GET | `/api/admin/quotes`, `/applications`, `/jobs` | admin |
| PATCH | `/api/admin/quotes/:id` (statut) | admin |
| POST / DELETE | `/api/admin/jobs`, `/api/admin/jobs/:id` | admin |

## Notes

- Stockage : fichier JSON (`backend/data/db.json`, créé au premier lancement). Suffisant pour démarrer ;
  pour un trafic important, remplacez `backend/src/db.js` par PostgreSQL ou MongoDB (mêmes 4 fonctions).
- E-mails : renseignez les variables `SMTP_*` et `MAIL_TO`. Sans cela, les notifications sont écrites dans la console.
- Sécurité : changez `JWT_SECRET` et `ADMIN_PASSWORD`, servez le site en HTTPS, sauvegardez `db.json`.
- Les images (`frontend/public/img`) sont les visuels UpesiTech recadrés ; remplacez-les par vos fichiers à tout moment.
