# 🚀 Résumé Rapide - Déploiement EC2

## 📦 Fichiers Créés

Tous les fichiers nécessaires pour le déploiement ont été créés :

### Configuration Locale
- ✅ `.gitignore` - Protection des fichiers `.env`
- ✅ `frontend/.env.example` - Template variables frontend
- ✅ `frontend/Dockerfile.prod` - Build production avec nginx
- ✅ `frontend/nginx-frontend.conf` - Config nginx pour SPA
- ✅ `docker-compose.prod.yml` - Orchestration production
- ✅ `.env.production.template` - Template variables serveur

### Configuration Serveur
- ✅ `nginx-server.conf` - Reverse proxy + SSL
- ✅ `deploy.sh` - Script de déploiement automatisé
- ✅ `DEPLOYMENT.md` - Guide complet étape par étape

## 🎯 Prochaines Étapes

### Sur votre machine locale

```bash
# 1. Commit et push les fichiers de configuration
git add .gitignore frontend/Dockerfile.prod frontend/nginx-frontend.conf docker-compose.prod.yml nginx-server.conf deploy.sh .env.production.template DEPLOYMENT.md
git commit -m "Add EC2 deployment configuration"
git push origin main
```

### Sur votre EC2

Suivez le guide complet dans **[DEPLOYMENT.md](DEPLOYMENT.md)**, voici le résumé :

#### 1. Installation Initiale (une seule fois)

```bash
# Installer Docker, Docker Compose, Nginx, Certbot
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo apt install -y nginx certbot python3-certbot-nginx git

# Cloner le projet
mkdir -p ~/apps && cd ~/apps
git clone <votre-repo-git> stock
cd stock
```

#### 2. Configuration Variables d'Environnement

```bash
# Créer .env.production à partir du template
cp .env.production.template .env.production
nano .env.production

# IMPORTANT: Remplir avec vos vraies valeurs :
# - POSTGRES_PASSWORD
# - JWT_SECRET (générer avec: openssl rand -base64 32)
# - JWT_REFRESH_SECRET (générer avec: openssl rand -base64 32)
```

#### 3. Configuration Nginx

```bash
# Copier et activer la config
sudo cp nginx-server.conf /etc/nginx/sites-available/stock
sudo ln -s /etc/nginx/sites-available/stock /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. Certificats SSL

```bash
# Obtenir les certificats Let's Encrypt
sudo certbot --nginx -d stock.sekuu.com -d stockapi.sekuu.com
```

#### 5. Premier Déploiement

```bash
# Build et démarrer
chmod +x deploy.sh
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Vérifier
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔄 Déploiements Futurs

Pour toutes les mises à jour ultérieures, simplement :

```bash
cd ~/apps/stock
./deploy.sh
```

## ✅ Vérification

Une fois déployé, vérifier :

- ✅ https://stock.sekuu.com - Frontend accessible
- ✅ https://stockapi.sekuu.com/health - API répond
- ✅ Cadenas SSL vert dans le navigateur
- ✅ Frontend peut communiquer avec l'API

## 🆘 Aide

- **Guide complet** : Voir [DEPLOYMENT.md](DEPLOYMENT.md)
- **Logs** : `docker-compose -f docker-compose.prod.yml logs -f`
- **Redémarrer** : `docker-compose -f docker-compose.prod.yml restart`

---

**🎉 Votre application sera disponible sur :**
- Frontend : https://stock.sekuu.com
- API : https://stockapi.sekuu.com

**🔐 Sécurité :**
- ❌ Les fichiers `.env` ne seront JAMAIS dans Git
- ✅ Création manuelle sur le serveur EC2
- ✅ SSL automatique avec Let's Encrypt
