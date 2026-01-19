#!/bin/bash

# Stock Management Deployment Script
# This script automates the deployment process on EC2

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Load environment variables
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found"
    echo "Please create it from .env.production.template"
    exit 1
fi

source .env.production

# Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin main

# Stop running containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build and start containers
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "⏳ Vérification de la santé des services..."

# Vérification du backend test
echo "Vérification du backend..."
for i in {1..10}; do
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Backend opérationnel"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ Le backend ne répond pas au health check"
        docker-compose -f docker-compose.prod.yml logs --tail=20 backend
        exit 1
    fi
    echo "Attente du backend... ($i/10)"
    sleep 3
done

# Vérification du frontend
echo "Vérification du frontend..."
if curl -sf http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Frontend opérationnel"
else
    echo "⚠️  Le frontend ne répond pas (peut être normal si nginx n'est pas configuré)"
fi

echo ""
echo "✅ Déploiement terminé avec succès!"
echo ""
echo "🌐 Votre application est accessible à :"
echo "   Frontend: https://stock.sekuu.com"
echo "   API:      https://stockapi.sekuu.com/api"
echo "   Health:   https://stockapi.sekuu.com/api/health"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "To restart services:"
echo "  docker-compose -f docker-compose.prod.yml restart"
