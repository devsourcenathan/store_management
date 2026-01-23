#!/bin/bash

# CORS Fix Deployment Script
# This script deploys the CORS configuration fixes to your VPS

set -e  # Exit on error

echo "🚀 Starting CORS Fix Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-your-vps-ip}"
PROJECT_PATH="${PROJECT_PATH:-/apps/store_management}"

echo -e "${YELLOW}⚠️  Please ensure you have set the following environment variables:${NC}"
echo "   VPS_USER (default: root)"
echo "   VPS_HOST (your VPS IP or domain)"
echo "   PROJECT_PATH (default: /apps/store_management)"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Step 1: Check SSL certificate for store_management.byevastore.com
echo -e "\n${YELLOW}Step 1: Checking SSL certificate for store_management.byevastore.com...${NC}"
ssh ${VPS_USER}@${VPS_HOST} "sudo certbot certificates | grep byevastore || echo 'Certificate not found'"

read -p "Does the SSL certificate exist for store_management.byevastore.com? (y/n): " cert_exists

if [ "$cert_exists" != "y" ]; then
    echo -e "${RED}❌ SSL certificate for store_management.byevastore.com not found!${NC}"
    echo -e "${YELLOW}Please run the following command on your VPS first:${NC}"
    echo "sudo certbot certonly --nginx -d store_management.byevastore.com"
    echo ""
    read -p "Press Enter after creating the certificate, or Ctrl+C to cancel..."
fi

# Step 2: Upload updated files
echo -e "\n${YELLOW}Step 2: Uploading updated configuration files...${NC}"

# Upload .env.prod
echo "Uploading backend/.env..."
scp backend/.env ${VPS_USER}@${VPS_HOST}:${PROJECT_PATH}/backend/.env

# Upload nginx-server.conf
echo "Uploading nginx-server.conf..."
scp nginx-server.conf ${VPS_USER}@${VPS_HOST}:/etc/nginx/sites-available/store_management

# Step 3: Verify Nginx configuration
echo -e "\n${YELLOW}Step 3: Testing Nginx configuration...${NC}"
ssh ${VPS_USER}@${VPS_HOST} "sudo nginx -t"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Nginx configuration test failed!${NC}"
    exit 1
fi

# Step 4: Reload Nginx
echo -e "\n${YELLOW}Step 4: Reloading Nginx...${NC}"
ssh ${VPS_USER}@${VPS_HOST} "sudo systemctl reload nginx"

# Step 5: Restart Docker containers
echo -e "\n${YELLOW}Step 5: Restarting Docker containers...${NC}"
ssh ${VPS_USER}@${VPS_HOST} "cd ${PROJECT_PATH} && docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d"

# Step 6: Wait for services to start
echo -e "\n${YELLOW}Step 6: Waiting for services to start (30 seconds)...${NC}"
sleep 30

# Step 7: Verify CORS configuration
echo -e "\n${YELLOW}Step 7: Verifying CORS configuration...${NC}"

# Check environment variable in container
echo "Checking CORS_ORIGIN in backend container..."
ssh ${VPS_USER}@${VPS_HOST} "docker exec stock-backend printenv | grep CORS_ORIGIN"

# Test CORS from store_management.sekuu.com
echo -e "\n${GREEN}Testing CORS from stock.sekuu.com...${NC}"
curl -H "Origin: https://stock.sekuu.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://stockapi.sekuu.com/api/auth/login \
     -v 2>&1 | grep -i "access-control" || echo "No CORS headers found"

# Test CORS from stock.byevastore.com
echo -e "\n${GREEN}Testing CORS from stock.byevastore.com...${NC}"
curl -H "Origin: https://stock.byevastore.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://stockapi.sekuu.com/api/auth/login \
     -v 2>&1 | grep -i "access-control" || echo "No CORS headers found"

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}Please test the following in your browser:${NC}"
echo "1. Open https://stock.sekuu.com and check the console for CORS errors"
echo "2. Open https://stock.byevastore.com and check the console for CORS errors"
echo "3. Try logging in from both domains"
