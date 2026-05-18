# Bundle local (Windows / zip / %APPDATA%)

Objectif: distribuer l'app **en zip**, utilisable **exclusivement en local**, avec les **données dans `%APPDATA%\\StockManagement`**.

## Données locales

Le backend supporte un dossier de données injecté via:
- `APP_DATA_DIR` → ex: `%APPDATA%\\StockManagement`

Quand `APP_DATA_DIR` est défini, le backend dérive:
- `LOCAL_MEDIA_DIR` (si non défini) → `%APPDATA%\\StockManagement\\media`
- (prévu pour la DB SQLite) `DATABASE_URL` (si `DB_PROVIDER=sqlite`)

## Images en local

Le backend peut stocker les médias sur disque:
- `MEDIA_STORAGE=local`
- `LOCAL_MEDIA_DIR=%APPDATA%\\StockManagement\\media`

Les URLs retournées utilisent l’endpoint:
- `GET /api/media/files/:id`

## Desktop wrapper (Electron)

Le dossier `desktop/` contient un wrapper Electron qui:
- calcule `%APPDATA%\\StockManagement`
- lance le backend en child-process avec `APP_DATA_DIR` + `MEDIA_STORAGE=local`
- sert le frontend buildé via `SERVE_FRONTEND_DIR`
- ouvre une fenêtre sur `http://127.0.0.1:<port>/`

Port par défaut: `3100` (modifiable via `LOCAL_PORT`).

## Build (dev)

1) Build frontend
- `cd frontend`
- `npm run build`

2) Build backend
- `cd backend`
- `npm run build`

3) Lancer desktop
- `cd desktop`
- `npm install`
- `npm run start`

## Générer le zip (distribution)

Préparer (à la racine du repo):
- Build frontend: `cd frontend` puis `npm run build`
- Build backend: `cd backend` puis `npm run build`
- Générer client Prisma SQLite: `cd backend` puis `npm run prisma:sqlite:generate`

Puis packager:
- `cd desktop`
- `npm install`
- `npm run dist:zip`

## SQLite (à finaliser)

Le backend actuel est Prisma/PostgreSQL (provider fixe). Pour un bundle 100% local **avec SQLite**, on génère un schema SQLite et un client Prisma SQLite séparé.

Prérequis: pour SQLite avec `Json` + `enum`, Prisma doit être en version **>= 6.2.0** (backend `package.json`).

1) Installer deps backend (si nécessaire)
- `cd backend`
- `npm install`

2) Générer le schema sqlite + client sqlite (dev/build)
- `cd backend`
- `npm run prisma:sqlite:generate`

3) Appliquer les migrations sqlite (dev, crée un fichier db si tu pointes `DATABASE_URL=file:...`)
- `cd backend`
- `npm run prisma:sqlite:migrate`

4) Exécution en mode bundle
- `DB_PROVIDER=sqlite`
- `APP_DATA_DIR=%APPDATA%\\StockManagement`
- Le backend dérive `DATABASE_URL=file:%APPDATA%\\StockManagement\\stock.db` si `DATABASE_URL` n’est pas défini.
