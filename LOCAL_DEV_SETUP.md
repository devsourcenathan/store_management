# Démarrage local (Docker + Postgres) — Stock Management

Ce guide explique comment démarrer le projet en local avec **PostgreSQL via Docker**, puis lancer **backend** (NestJS) et **frontend** (React/Vite).

> Répertoire racine (Windows): `C:\Users\nathan.tchinda\projects\stock`

## Prérequis

- Node.js **20+**
- Docker Desktop (Docker + Docker Compose)

Ports utilisés par défaut:
- Postgres: `5432`
- Backend: `3000` (API: `http://localhost:3000/api`)
- Frontend: `5173`

---

## Option A (recommandée): Docker pour Postgres, backend/frontend en local

### 1) Configurer l’environnement (backend)

Copier l’exemple:

```powershell
cd C:\Users\nathan.tchinda\projects\stock\backend
copy .env.example .env
```

Vérifier au minimum dans `backend\.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_management_prod?schema=public"
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
CORS_ORIGIN=http://localhost:5173
```

### 2) Démarrer Postgres avec Docker

Le `docker-compose.yml` lit les identifiants depuis `.env.production`. En local, crée ce fichier à partir du template:

```powershell
cd C:\Users\nathan.tchinda\projects\stock
copy .env.production.template .env.production
```

Puis édite `C:\Users\nathan.tchinda\projects\stock\.env.production` et mets au minimum:
- `POSTGRES_PASSWORD` (obligatoire)
- (optionnel) `POSTGRES_USER`, `POSTGRES_DB`

Démarrage:

```powershell
cd C:\Users\nathan.tchinda\projects\stock
docker-compose up -d postgres
```

### 3) Installer + initialiser la base (migrations + seed)

```powershell
cd C:\Users\nathan.tchinda\projects\stock\backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
```

> Alternative Windows: `backend\init-db.bat` (si tu préfères).

### 4) Démarrer le backend (dev)

```powershell
cd C:\Users\nathan.tchinda\projects\stock\backend
npm run start:dev
```

Vérifier:
- `http://localhost:3000/api/health`

### 5) Démarrer le frontend (dev)

```powershell
cd C:\Users\nathan.tchinda\projects\stock\frontend
npm install
copy .env.example .env
npm run dev
```

Vérifier:
- `http://localhost:5173`

---

## Option B: Tout via Docker (postgres + backend + frontend)

```powershell
cd C:\Users\nathan.tchinda\projects\stock
copy .env.production.template .env.production
docker-compose up -d --build
```

Important:
- Le `docker-compose.yml` démarre le backend en **mode production**.
- Les migrations/seed **ne sont pas exécutées automatiquement** au démarrage du container.
- Fais donc l’étape “migrations + seed” depuis l’hôte (Option A / étape 3) avant de tester l’app.

---

## Identifiants de test (seed)

Après `npm run prisma:seed`, tu peux utiliser (si le seed les crée):
- `owner@demo.com` / `password123`
- `manager@demo.com` / `password123`
- `staff@demo.com` / `password123`

---

## Arrêter / reset (Docker)

Arrêter:
```powershell
cd C:\Users\nathan.tchinda\projects\stock
docker-compose down
```

Supprimer les données Postgres (réinitialisation complète):
```powershell
cd C:\Users\nathan.tchinda\projects\stock
docker-compose down -v
```

---

## Dépannage rapide

### Port déjà utilisé

- Backend: `3000`
- Frontend: `5173`
- Postgres: `5432`

Sur Windows:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Erreurs Prisma / DB

1) Vérifie que Postgres tourne:
```powershell
docker ps
```

2) Vérifie `DATABASE_URL` dans `backend\.env`

3) Régénère Prisma + relance migrations:
```powershell
cd C:\Users\nathan.tchinda\projects\stock\backend
npx prisma generate
npx prisma migrate dev
```

