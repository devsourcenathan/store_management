# Database Setup Guide

## Prerequisites
- PostgreSQL 16+ installed and running
- Node.js 20+ installed

## Steps

### 1. Create Database

```bash
# Using psql
psql -U postgres
CREATE DATABASE stock_management_prod;
\q
```

Or use Docker:
```bash
docker run --name stock-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=stock_management_prod \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and update:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_management_prod?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this"
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

This generates the TypeScript types from your schema.

### 4. Run Migrations

```bash
npx prisma migrate dev --name init
```

This will:
- Create the migration files
- Apply migrations to the database
- Generate Prisma Client

### 5. Seed Database (Optional)

```bash
npm run prisma:seed
```

This creates demo data:
- 1 Organization (Demo Company)
- 2 Stores (Main Store, Branch Store)
- 3 Users (owner, manager, staff) - password: `password123`
- 3 Categories (Electronics, Clothing, Food)
- 5 Products
- Stock movements
- 2 Customers
- 2 Sales
- 1 Supplier
- 1 Subscription service

### 6. Verify Setup

```bash
# Open Prisma Studio to view data
npx prisma studio
```

This opens a web UI at http://localhost:5555

## Troubleshooting

### Connection Error
If you get a connection error:
1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL in `.env`
3. Ensure database exists: `psql -U postgres -l`

### Migration Error
If migrations fail:
1. Reset database: `npx prisma migrate reset`
2. Re-run migrations: `npx prisma migrate dev`

### Seed Error
If seed fails:
1. Check database connection
2. Ensure migrations are applied
3. Run seed with verbose: `npm run prisma:seed`

## Database Schema Overview

### Core Tables
- `organizations` - Multi-tenancy root
- `stores` - Physical locations
- `users` - With roles (OWNER, MANAGER, STAFF)
- `user_stores` - Many-to-many relationship

### Products
- `products` - Product catalog
- `categories` - Hierarchical categories
- `pricing_rules` - Dynamic pricing (JSONB)

### Stock (Append-Only)
- `stock_movements` - All stock changes
- `stock_alerts` - Low stock alerts

**Important**: Stock levels are NEVER stored directly. They are calculated from movements.

### Sales
- `sales` - Sale headers
- `sale_items` - Line items
- `payments` - Payment records (supports partial payments)

### Customers & Suppliers
- `customers` - Customer records with credit tracking
- `suppliers` - Supplier records
- `supplies` - Purchase orders
- `supply_items` - Purchase line items
- `supplier_balance_entries` - Ledger for supplier payments

### Subscriptions
- `services` - Third-party services
- `subscription_offers` - Plans with dynamic pricing
- `subscription_options` - Add-ons
- `customer_subscriptions` - Active subscriptions
- `subscription_balance_entries` - Billing ledger

### System
- `audit_logs` - Complete audit trail
- `sync_metadata` - Offline sync tracking

## Next Steps

After database setup:
1. Start backend: `npm run start:dev`
2. Test auth: `POST http://localhost:3000/api/auth/login`
3. Continue with Phase 3: Authentication & Authorization
