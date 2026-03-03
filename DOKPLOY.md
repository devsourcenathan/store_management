# 🚀 Déploiement avec Dokploy

Ce guide décrit comment déployer l'application de gestion de stock sur un serveur Dokploy.

## Architecture déployée

```
Internet
   │
   ▼
[Traefik] ← reverse proxy géré par Dokploy (HTTPS auto via Let's Encrypt)
   │
   ├── stock.tondomain.com    → [Frontend] React PWA (Nginx:80)
   └── stockapi.tondomain.com → [Backend]  NestJS API (Node:3000)
                                      │
                                      └── [PostgreSQL 16]
```

## Prérequis

- Un serveur avec [Dokploy](https://dokploy.com) installé
- Un nom de domaine avec 2 sous-domaines pointant vers l'IP du serveur :
  - `stock.tondomain.com` → Frontend
  - `stockapi.tondomain.com` → Backend
- Un repo Git contenant ce projet (GitHub / GitLab / Gitea)

---

## Étapes de déploiement

### 1. Créer un projet dans Dokploy

1. Dokploy Dashboard → **"Projects" → "Create Project"**
2. Choisir **"Docker Compose"**
3. Connecter ton repo Git
4. Définir le **Compose File** : `docker-compose.prod.yml`
5. Définir la branche : `main` (ou ta branche de prod)

### 2. Configurer les variables d'environnement

Dans Dokploy → ton projet → onglet **"Environment"**, coller toutes les variables du fichier `.env.production.template` avec les vraies valeurs :

```env
# Domaines
FRONTEND_DOMAIN=stock.tondomain.com
BACKEND_DOMAIN=stockapi.tondomain.com

# Base de données
POSTGRES_PASSWORD=<mot_de_passe_très_fort>

# JWT (générer avec : openssl rand -base64 32)
JWT_SECRET=<secret_aléatoire>
JWT_REFRESH_SECRET=<autre_secret_aléatoire>

# CORS
CORS_ORIGIN=https://stock.tondomain.com

# Frontend
VITE_API_URL=https://stockapi.tondomain.com/api

# ... (voir .env.production.template pour toutes les variables)
```

> ⚠️ **Important** : `VITE_API_URL` est injecté **à la build**, pas au runtime. Si tu changes ce domaine, il faut **redéployer** le frontend.

### 3. Configurer les domaines dans Dokploy

Pour chaque service, Dokploy permet de configurer les domaines via l'interface. Les **labels Traefik** sont déjà définis dans `docker-compose.prod.yml` — Dokploy les lira automatiquement.

Alternatively, dans l'onglet **"Domains"** de chaque service :
- `frontend` → `stock.tondomain.com` (port 80) + activer HTTPS
- `backend` → `stockapi.tondomain.com` (port 3000) + activer HTTPS

### 4. Premier déploiement

Cliquer sur **"Deploy"** dans Dokploy.

Le backend exécute automatiquement les migrations Prisma au démarrage :
```
npx prisma migrate deploy && npm run start:prod
```

### 5. Vérifier le déploiement

- ✅ Frontend : `https://stock.tondomain.com`
- ✅ API Health : `https://stockapi.tondomain.com/api/health`
- ✅ Logs backend dans Dokploy → service `backend` → onglet "Logs"

---

## Variables d'environnement — Référence complète

| Variable | Obligatoire | Description |
|---|---|---|
| `FRONTEND_DOMAIN` | ✅ | Domaine du frontend (ex: `stock.monsite.com`) |
| `BACKEND_DOMAIN` | ✅ | Domaine du backend (ex: `stockapi.monsite.com`) |
| `POSTGRES_PASSWORD` | ✅ | Mot de passe PostgreSQL |
| `JWT_SECRET` | ✅ | Secret JWT (générer : `openssl rand -base64 32`) |
| `JWT_REFRESH_SECRET` | ✅ | Secret JWT refresh |
| `CORS_ORIGIN` | ✅ | URL du frontend (ex: `https://stock.monsite.com`) |
| `VITE_API_URL` | ✅ | URL publique de l'API (ex: `https://stockapi.monsite.com/api`) |
| `AWS_ACCESS_KEY_ID` | ⚠️ | Requis si uploads S3 activés |
| `AWS_SECRET_ACCESS_KEY` | ⚠️ | Requis si uploads S3 activés |
| `AWS_S3_BUCKET` | ⚠️ | Requis si uploads S3 activés |
| `RESEND_API_KEY` | ⚠️ | Requis si emails activés (`ENABLE_EMAILS=true`) |
| `SENTRY_DSN` | ➖ | Optionnel — monitoring Sentry |

---

## Gestion des données (Backups)

Les données PostgreSQL persistent dans le volume Docker `postgres_data`.

Pour configurer des backups automatiques : Dokploy → ton projet → onglet **"Backups"**.

---

## Redéploiement

- **Mise à jour du code** : Dokploy peut redéployer automatiquement sur chaque push Git (activer le webhook dans "Deployments → Auto Deploy")
- **Changement de `VITE_API_URL`** : Nécessite un rebuild complet du service `frontend`

---

## Dépannage

| Symptôme | Solution |
|---|---|
| Frontend affiche une erreur CORS | Vérifier que `CORS_ORIGIN` correspond exactement au domaine frontend |
| `prisma migrate deploy` échoue | Vérifier `DATABASE_URL` et que `postgres` est `healthy` |
| L'API n'est pas joignable | Vérifier `BACKEND_DOMAIN` et les labels Traefik |
| Images non uploadées | Vérifier les credentials AWS S3 |
| Emails non envoyés | Vérifier `RESEND_API_KEY` et `ENABLE_EMAILS=true` |
