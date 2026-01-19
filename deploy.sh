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

# Check if containers are running
echo "✅ Checking container status..."
docker-compose -f docker-compose.prod.yml ps

# Health check
echo "🏥 Running health checks..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Warning: Backend health check failed"
fi

if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Warning: Frontend health check failed"
fi

echo ""
echo "✨ Deployment complete!"
echo "Frontend: https://stock.sekuu.com"
echo "API: https://stockapi.sekuu.com"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "To restart services:"
echo "  docker-compose -f docker-compose.prod.yml restart"
