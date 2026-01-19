# 🚀 Guide de Déploiement EC2 - Stock Management

Guide complet pour déployer l'application Stock Management sur votre instance EC2 avec SSL automatique.

## 📋 Prérequis

✅ Instance EC2 avec accès SSH  
✅ Domaines configurés : `stock.sekuu.com` et `stockapi.sekuu.com` pointant vers l'IP EC2  
✅ Ports ouverts dans Security Group : 80 (HTTP), 443 (HTTPS), 22 (SSH)

## 🛠️ Installation Initiale sur EC2

### 1. Connexion SSH

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
# ou ec2-user selon votre AMI
```

### 2. Installation des dépendances

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installation de Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Installation de Nginx
sudo apt install -y nginx

# Installation de Certbot
sudo apt install -y certbot python3-certbot-nginx

# Installation de Git
sudo apt install -y git

# Redémarrer pour appliquer les groupes
exit
# Reconnectez-vous
```

### 3. Configuration de Git

```bash
# Configurer Git (si repository privé)
git config --global user.name "Nathan Tchinda"
git config --global user.email "sadenachbinathan@gmail.com"

# Configurer l'accès SSH à GitHub (recommandé)
ssh-keygen -t ed25519 -C "sadenachbinathan@gmail.com"
cat ~/.ssh/id_ed25519.pub
# Ajouter cette clé dans GitHub Settings > SSH Keys
```

### 4. Clone du projet

```bash
# Créer le dossier de déploiement
mkdir -p ~/apps
cd ~/apps

# Cloner le repo
git clone git@github.com:devsourcenathan/store_management.git
# ou via HTTPS: git clone https://github.com/your-username/stock.git

cd store_management
```

## 🔐 Configuration des Variables d'Environnement

### 1. Créer le fichier .env.production

```bash
cd ~/apps/store_management
cp .env.production.template .env.production
nano .env.production
```

### 2. Remplir les valeurs importantes

```env
# Database
POSTGRES_PASSWORD=VotreMo tDePasseFortetSecurisé123!

# JWT Secrets (générer avec: openssl rand -base64 32)
JWT_SECRET=votre_secret_jwt_super_long_et_aleatoire
JWT_REFRESH_SECRET=votre_autre_secret_jwt_super_long_et_aleatoire

# AWS S3 (optionnel pour uploads d'images)
AWS_ACCESS_KEY_ID=votre_access_key_si_necessaire
AWS_SECRET_ACCESS_KEY=votre_secret_key_si_necessaire
AWS_S3_BUCKET=nom_de_votre_bucket
```

**💡 Astuce** : Générer des secrets forts :
```bash
openssl rand -base64 32
```

## 🌐 Configuration Nginx

### 1. Copier la configuration nginx

```bash
sudo cp ~/apps/store_management/nginx-server.conf /etc/nginx/sites-available/store_management
sudo ln -s /etc/nginx/sites-available/store_management /etc/nginx/sites-enabled/
```

### 2. Désactiver le site par défaut

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 3. Créer le dossier pour certbot

```bash
sudo mkdir -p /var/www/certbot
```

### 4. Tester la configuration

```bash
sudo nginx -t
```

### 5. Redémarrer nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 Configuration SSL avec Let's Encrypt

### 1. Obtenir les certificats

```bash
# Pour le frontend
sudo certbot --nginx -d stock.sekuu.com --non-interactive --agree-tos -m sadenachbinathan@gmail.com

# Pour l'API
sudo certbot --nginx -d stockapi.sekuu.com --non-interactive --agree-tos -m sadenachbinathan@gmail.com
```

### 2. Recharger nginx

```bash
sudo systemctl reload nginx
```

### 3. Vérifier le renouvellement automatique

```bash
sudo certbot renew --dry-run
```

Les certificats se renouvelleront automatiquement tous les 90 jours.

## 🐳 Premier Déploiement

### 1. Rendre le script exécutable

```bash
cd ~/apps/store_management
chmod +x deploy.sh
```

### 2. Build initial (sans git pull)

```bash
# Build des images
docker-compose -f docker-compose.prod.yml build

# Démarrer les services
docker-compose -f docker-compose.prod.yml up -d

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Vérifier que tout fonctionne

```bash
# Backend
curl http://localhost:3000/health

# Frontend
curl http://localhost:8080

# Depuis l'extérieur avec SSL
curl https://stockapi.sekuu.com/health
curl https://stock.sekuu.com
```

## 🔄 Déploiements Ultérieurs

Pour les mises à jour, utilisez simplement le script :

```bash
cd ~/apps/stock
./deploy.sh
```

Ce script va :
1. ✅ Charger les variables d'environnement
2. ✅ Pull le code depuis Git
3. ✅ Arrêter les conteneurs
4. ✅ Rebuild les images
5. ✅ Redémarrer les services
6. ✅ Vérifier la santé des services

## 📊 Commandes Utiles

### Voir les logs

```bash
# Tous les services
docker-compose -f docker-compose.prod.yml logs -f

# Backend uniquement
docker-compose -f docker-compose.prod.yml logs -f backend

# Frontend uniquement
docker-compose -f docker-compose.prod.yml logs -f frontend

# Base de données
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Redémarrer les services

```bash
# Tous les services
docker-compose -f docker-compose.prod.yml restart

# Un service spécifique
docker-compose -f docker-compose.prod.yml restart backend
```

### Arrêter/Démarrer

```bash
# Arrêter tout
docker-compose -f docker-compose.prod.yml down

# Démarrer tout
docker-compose -f docker-compose.prod.yml up -d
```

### Accéder à la base de données

```bash
docker exec -it stock-postgres psql -U postgres -d stock_management
```

### Nettoyer les images inutilisées

```bash
docker system prune -a
```

## 🔍 Troubleshooting

### Les domaines ne résolvent pas

```bash
# Vérifier la résolution DNS
nslookup stock.sekuu.com
nslookup stockapi.sekuu.com

# Vérifier nginx
sudo nginx -t
sudo systemctl status nginx
```

### Erreur 502 Bad Gateway

```bash
# Vérifier que les conteneurs tournent
docker-compose -f docker-compose.prod.yml ps

# Vérifier les logs backend
docker-compose -f docker-compose.prod.yml logs backend

# Vérifier que le backend écoute
curl http://localhost:3000/health
```

### Problème de base de données

```bash
# Vérifier que PostgreSQL est démarré
docker-compose -f docker-compose.prod.yml ps postgres

# Voir les logs
docker-compose -f docker-compose.prod.yml logs postgres

# Redémarrer PostgreSQL
docker-compose -f docker-compose.prod.yml restart postgres
```

### Erreurs de migration Prisma

```bash
# Accéder au conteneur backend
docker exec -it stock-backend sh

# Réinitialiser la base (⚠️ ATTENTION: supprime les données)
npx prisma migrate reset --force

# Ou appliquer les migrations
npx prisma migrate deploy
```

## 🔐 Sécurité

### Firewall (recommandé)

```bash
# Installer UFW
sudo apt install -y ufw

# Autoriser SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activer le firewall
sudo ufw enable
```

### Backups de la base de données

```bash
# Créer un backup
docker exec stock-postgres pg_dump -U postgres stock_management > backup_$(date +%Y%m%d).sql

# Restaurer un backup
cat backup_20260119.sql | docker exec -i stock-postgres psql -U postgres stock_management
```

### Automatiser les backups (cron)

```bash
# Éditer crontab
crontab -e

# Ajouter cette ligne pour backup quotidien à 2h du matin
0 2 * * * cd ~/apps/stock && docker exec stock-postgres pg_dump -U postgres stock_management > ~/backups/stock_$(date +\%Y\%m\%d).sql
```

## 📈 Monitoring

### Vérifier l'utilisation des ressources

```bash
# CPU et RAM des conteneurs
docker stats

# Espace disque
df -h

# Logs nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## ✅ Checklist Post-Déploiement

- [ ] Les deux domaines sont accessibles en HTTPS
- [ ] Le cadenas SSL est vert
- [ ] Le frontend charge correctement
- [ ] Le frontend peut communiquer avec l'API
- [ ] Les logs ne montrent pas d'erreurs critiques
- [ ] La base de données persiste après redémarrage
- [ ] Les backups automatiques sont configurés

## 🆘 Support

En cas de problème :
1. Vérifier les logs : `docker-compose -f docker-compose.prod.yml logs -f`
2. Vérifier nginx : `sudo nginx -t && sudo systemctl status nginx`
3. Vérifier les certificats : `sudo certbot certificates`
4. Vérifier que Docker tourne : `docker ps`

---

**🎉 Félicitations !** Votre application est maintenant déployée sur :
- Frontend : https://stock.sekuu.com
- API : https://stockapi.sekuu.com
