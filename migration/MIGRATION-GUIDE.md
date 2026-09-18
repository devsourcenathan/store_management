# ============================================
# Guide de Migration Complet
# ============================================
# Migration de l'architecture EC2 vers
# Backend EC2 + Frontend Vercel + Database Neon

## Architecture Actuelle → Cible

```
AVANT (tout sur un EC2)          APRÈS (distributed)
┌─────────────────────┐         ┌─────────────────────┐
│      EC2            │         │      EC2 (Backend)  │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │    Nginx      │  │         │  │    Nginx      │  │
│  │  (Frontend)   │  │   →     │  │  (Reverse     │  │
│  │  :8080        │  │         │  │   Proxy)      │  │
│  └───────────────┘  │         │  │  :80/443      │  │
│  ┌───────────────┐  │         │  └───────────────┘  │
│  │   Backend     │  │         │  ┌───────────────┐  │
│  │   :3000       │  │         │  │   Backend     │  │
│  └───────────────┘  │         │  │   :3000       │  │
│  ┌───────────────┐  │         │  └───────────────┘  │
│  │  PostgreSQL   │  │         └─────────────────────┘
│  │  (Supabase)   │  │         ┌─────────────────────┐
│  └───────────────┘  │         │    Vercel           │
└─────────────────────┘         │  ┌───────────────┐  │
                                │  │   Frontend    │  │
                                │  │   (PWA)       │  │
                                │  └───────────────┘  │
                                └─────────────────────┘
                                ┌─────────────────────┐
                                │    Neon             │
                                │  ┌───────────────┐  │
                                │  │  PostgreSQL   │  │
                                │  └───────────────┘  │
                                └─────────────────────┘
```

## Prérequis

- [ ] Accès à l'ancien EC2 (SSH)
- [ ] Accès au nouvel EC2 (SSH)
- [ ] Compte Vercel
- [ ] Accès au provider DNS
- [ ] PostgreSQL client installé (psql)

## Étapes de Migration

### Phase 1: Backup (30 min)

```bash
# 1. Backup de la base Supabase
cd migration/scripts
.\backup-supabase.ps1

# Ou sur Linux/Mac:
./backup-supabase.sh
```

### Phase 2: Base de données (15 min)

```bash
# 2. Restaurer vers Neon
.\restore-neon.ps1 ..\backups\supabase_backup_XXXXXXXX.sql

# Ou sur Linux/Mac:
./restore-neon.sh ../backups/supabase_backup_XXXXXXXX.sql
```

### Phase 3: Backend EC2 (45 min)

```bash
# 3. Configurer le nouvel EC2
ssh ubuntu@<IP_EC2_NOUVEAU>

# Télécharger et exécuter le script
wget https://raw.githubusercontent.com/.../setup-ec2-backend.sh
sudo bash setup-ec2-backend.sh

# Copier le fichier .env
scp migration/configs/backend.env.prod ubuntu@<IP_EC2>:/opt/stock-backend/backend/.env

# Déployer
cd /opt/stock-backend
git clone <repo-url> .
docker compose -f migration/configs/docker-compose.backend.yml up -d
```

### Phase 4: Frontend Vercel (30 min)

```bash
# 4. Configurer Vercel
cd frontend

# Login Vercel
vercel login

# Initialiser le projet
vercel

# Configurer les variables d'environnement
vercel env add VITE_API_URL
# Valeur: https://stockapi.sekuu.com/api

vercel env add VITE_SENTRY_DSN
# Valeur: https://8121455c923e6d952772266467899dd6@o4510816941113344.ingest.us.sentry.io/4510816944062464

vercel env add VITE_CLARITY_PROJECT_ID
# Valeur: vb5enlrofp

# Déployer
vercel --prod

# Ajouter les domaines
vercel domains add stock.sekuu.com
vercel domains add stock.byevastore.com
```

### Phase 5: DNS (15 min)

```bash
# 5. Configurer les DNS
# Voir migration/configs/dns-configuration.md

# Frontend (Vercel)
stock.sekuu.com      → cname.vercel-dns.com (CNAME)
stock.byevastore.com → cname.vercel-dns.com (CNAME)
stockn.byevastore.com → cname.vercel-dns.com (CNAME)
new.byevastore.com   → cname.vercel-dns.com (CNAME)

# Backend (EC2)
stockapi.sekuu.com   → <IP_EC2_NOUVEAU> (A)
```

### Phase 6: Vérification (10 min)

```bash
# 6. Vérifier la migration
.\scripts\verify-migration.ps1

# Ou vérifier manuellement
curl https://stockapi.sekuu.com/api/health
curl https://stock.sekuu.com
```

## Fichiers de Configuration

| Fichier | Description |
|---------|-------------|
| `configs/backend.env.prod` | Variables d'environnement pour le backend EC2 |
| `configs/docker-compose.backend.yml` | Docker Compose pour le backend |
| `configs/vercel.json` | Configuration Vercel pour le frontend |
| `configs/vercel-env.txt` | Variables d'environnement Vercel |
| `configs/dns-configuration.md` | Guide de configuration DNS |
| `configs/docker-compose.prod.yml` | Nouveau docker-compose.prod.yml (backend seul) |

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/backup-supabase.ps1` | Backup de la base Supabase (Windows) |
| `scripts/backup-supabase.sh` | Backup de la base Supabase (Linux/Mac) |
| `scripts/restore-neon.ps1` | Restauration vers Neon (Windows) |
| `scripts/restore-neon.sh` | Restauration vers Neon (Linux/Mac) |
| `scripts/setup-ec2-backend.sh` | Configuration du nouvel EC2 |
| `scripts/deploy-backend-ec2.sh` | Déploiement du backend sur EC2 |
| `scripts/setup-vercel.ps1` | Configuration de Vercel |
| `scripts/verify-migration.ps1` | Vérification post-migration |
| `scripts/rollback.ps1` | Rollback vers l'ancienne config |

## Dépannage

### Le backend ne démarre pas

```bash
# Vérifier les logs
docker compose logs backend

# Vérifier la connexion à Neon
psql "postgresql://neondb_owner:npg_WhX3CJ5ctjOU@ep-nameless-wildflower-atnndy1x-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Vérifier Prisma
npx prisma migrate status
```

### Le frontend ne charge pas

```bash
# Vérifier les logs Vercel
vercel logs

# Vérifier les variables d'environnement
vercel env ls
```

### Les DNS ne propagent pas

```bash
# Vérifier la propagation
nslookup stock.sekuu.com
nslookup stockapi.sekuu.com

# Vérifier avec dig
dig stock.sekuu.com
dig stockapi.sekuu.com
```

## Rollback

Si la migration échoue:

```bash
# Exécuter le script de rollback
.\scripts\rollback.ps1

# Ou manuellement:
# 1. Restaurer l'ancien docker-compose.prod.yml
# 2. Redémarrer sur l'ancien EC2
# 3. Restaurer les DNS
```

## Support

En cas de problème:
1. Consultez les logs
2. Vérifiez les variables d'environnement
3. Testez la connectivité réseau
4. Vérifiez les certificats SSL
