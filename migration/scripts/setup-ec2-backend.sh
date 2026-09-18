# ============================================
# Script de configuration du Backend sur EC2
# ============================================
# Ce script configure un EC2 fresh pour le backend

set -e

echo "========================================"
echo " CONFIGURATION EC2 POUR BACKEND"
echo "========================================"
echo ""

# 1. Mise à jour du système
echo "1. Mise à jour du système..."
apt-get update -y
apt-get upgrade -y

# 2. Installation des dépendances
echo "2. Installation des dépendances..."
apt-get install -y \
    curl \
    wget \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    docker.io \
    docker-compose-plugin \
    ufw

# 3. Démarrage de Docker
echo "3. Démarrage de Docker..."
systemctl enable docker
systemctl start docker

# 4. Configuration du pare-feu
echo "4. Configuration du pare-feu..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 5. Création du répertoire de l'application
echo "5. Création du répertoire de l'application..."
mkdir -p /opt/stock-backend
mkdir -p /var/log/stock-backend

# 6. Configuration de Nginx
echo "6. Configuration de Nginx..."
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
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 7. Configuration du certificat SSL
echo "7. Configuration du certificat SSL..."
echo "IMPORTANT: Assurez-vous que le DNS pour stockapi.sekuu.com pointe vers cette IP"
echo "Appuyez sur Entrée pour continuer..."
read

certbot --nginx -d stockapi.sekuu.com --non-interactive --agree-tos --email admin@sekuu.com

# 8. Configuration du renouvellement automatique
echo "8. Configuration du renouvellement automatique..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo ""
echo "========================================"
echo " CONFIGURATION TERMINÉE!"
echo "========================================"
echo ""
echo "Prochaines étapes:"
echo "1. Cloner le dépôt: cd /opt/stock-backend && git clone <repo-url> ."
echo "2. Créer le fichier .env"
echo "3. Lancer le déploiement: docker compose up -d"
