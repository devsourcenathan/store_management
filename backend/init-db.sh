#!/bin/bash

# Database Initialization Script
# This script sets up the database from scratch

set -e

echo "🚀 Starting database initialization..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your database credentials."
    echo ""
    echo "Press Enter to continue after updating .env..."
    read
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate dev --name init
echo "✅ Migrations completed"
echo ""

# Seed database
echo "🌱 Seeding database with demo data..."
npm run prisma:seed
echo "✅ Database seeded"
echo ""

echo "🎉 Database initialization complete!"
echo ""
echo "📝 Test credentials:"
echo "   Owner:   owner@demo.com / password123"
echo "   Manager: manager@demo.com / password123"
echo "   Staff:   staff@demo.com / password123"
echo ""
echo "🔍 To view data, run: npx prisma studio"
echo ""
