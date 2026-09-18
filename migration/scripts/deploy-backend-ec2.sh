# ============================================
# Script de déploiement Backend sur EC2
# ============================================
# Ce script doit être exécuté sur le nouvel EC2
# Usage: sudo bash deploy-backend.sh

set -e

# Configuration
APP_DIR="/opt/stock-backend"
REPO_URL="https://github.com/votre-repo/stock.git"
BRANCH="main"

echo "========================================"
echo " DÉPLOIEMENT BACKEND SUR EC2"
echo "========================================"
echo ""

# 1. Mise à jour du système
echo "1. Mise à jour du système..."
apt-get update -y
apt-get upgrade -y

# 2. Installation des dépendances
echo "2. Installation des dépendances..."
apt-get install -y curl wget git nginx certbot python3-certbot-nginx docker.io docker-compose-plugin

# 3. Démarrage de Docker
echo "3. Démarrage de Docker..."
systemctl enable docker
systemctl start docker

# 4. Configuration du répertoire de l'application
echo "4. Configuration de l'application..."
mkdir -p $APP_DIR
cd $APP_DIR

# 5. Cloner ou mettre à jour le code
if [ -d ".git" ]; then
    echo "Mise à jour du code..."
    git pull origin $BRANCH
else
    echo "Clonage du dépôt..."
    git clone -b $BRANCH $REPO_URL .
fi

# 6. Copier le fichier .env
echo "5. Configuration de l'environnement..."
if [ ! -f ".env" ]; then
    echo "ATTENTION: Créez le fichier .env dans $APP_DIR"
    echo "Utilisez le fichier configs/backend.env.prod comme modèle"
    echo "Appuyez sur Entrée une fois le fichier .env créé..."
    read
fi

# 7. Build et démarrage
echo "6. Build et démarrage du backend..."
cd backend
docker compose -f ../migration/configs/docker-compose.backend.yml up -d --build

# 8. Configuration Nginx
echo "7. Configuration de Nginx..."
cat > /etc/nginx/sites-available/stockapi <<'EOF'
server {
    listen 80;
    server_name stockapi.sekuu.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name stockapi.sekuu.com;

    ssl_certificate /etc/letsencrypt/live/stockapi.sekuu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stockapi.sekuu.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/stockapi /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 9. Configuration du certificat SSL
echo "8. Configuration du certificat SSL..."
certbot --nginx -d stockapi.sekuu.com --non-interactive --agree-tos --email admin@sekuu.com

# 10. Configuration du pare-feu
echo "9. Configuration du pare-feu..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "========================================"
echo " DÉPLOIEMENT TERMINÉ!"
echo "========================================"
echo ""
echo "Backend accessible sur: https://stockapi.sekuu.com"
echo ""
echo "Prochaines étapes:"
echo "1. Vérifiez que le backend fonctionne: curl https://stockapi.sekuu.com/api/health"
echo "2. Configurez le frontend sur Vercel"
echo "3. Mettez à jour les DNS"
