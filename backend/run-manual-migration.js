const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
    try {
        console.log('Starting manual migration...');
        
        // 1. Create StockMovementSource enum
        console.log('[1/10] Creating StockMovementSource enum...');
        await prisma.$executeRawUnsafe(`CREATE TYPE "StockMovementSource" AS ENUM ('SALE', 'SUPPLY', 'RETURN', 'MANUAL')`);
        
        // 2. Add source column with default
        console.log('[2/10] Adding source column to stock_movements...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "stock_movements" ADD COLUMN "source" "StockMovementSource" DEFAULT 'MANUAL'`);
        
        // 3. Make source NOT NULL
        console.log('[3/10] Making source NOT NULL...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "stock_movements" ALTER COLUMN "source" SET NOT NULL`);
        
        // 4. Drop default
        console.log('[4/10] Dropping default from source...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "stock_movements" ALTER COLUMN "source" DROP DEFAULT`);
        
        // 5. Add duration to subscription_offers
        console.log('[5/10] Adding duration to subscription_offers...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "subscription_offers" ADD COLUMN "duration" INTEGER DEFAULT 30 NOT NULL`);
        
        // 6. Drop default from duration
        console.log('[6/10] Dropping default from duration...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "subscription_offers" ALTER COLUMN "duration" DROP DEFAULT`);
        
        // 7. Create BalanceAlertType enum
        console.log('[7/10] Creating BalanceAlertType enum...');
        await prisma.$executeRawUnsafe(`CREATE TYPE "BalanceAlertType" AS ENUM ('NEGATIVE', 'LOW_BALANCE')`);
        
        // 8. Create subscription_renewals table
        console.log('[8/10] Creating subscription_renewals table...');
        await prisma.$executeRawUnsafe(`
            CREATE TABLE "subscription_renewals" (
                "id" TEXT NOT NULL,
                "subscriptionId" TEXT NOT NULL,
                "duration" INTEGER NOT NULL,
                "price" DECIMAL(10,2) NOT NULL,
                "balanceUsed" DECIMAL(10,2) NOT NULL,
                "createdBy" TEXT NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "syncedAt" TIMESTAMP(3),
                "clientId" TEXT,
                CONSTRAINT "subscription_renewals_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "subscription_renewals_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "customer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        
        // 9. Create subscription_balance_alerts table
        console.log('[9/10] Creating subscription_balance_alerts table...');
        await prisma.$executeRawUnsafe(`
            CREATE TABLE "subscription_balance_alerts" (
                "id" TEXT NOT NULL,
                "accountId" TEXT NOT NULL,
                "type" "BalanceAlertType" NOT NULL,
                "threshold" DECIMAL(10,2),
                "currentBalance" DECIMAL(10,2) NOT NULL,
                "resolved" BOOLEAN NOT NULL DEFAULT false,
                "resolvedBy" TEXT,
                "resolvedAt" TIMESTAMP(3),
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "subscription_balance_alerts_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "subscription_balance_alerts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "subscription_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        
        // 10. Create indexes
        console.log('[10/10] Creating indexes...');
        await prisma.$executeRawUnsafe(`CREATE INDEX "subscription_renewals_subscriptionId_createdAt_idx" ON "subscription_renewals"("subscriptionId", "createdAt")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX "subscription_renewals_clientId_idx" ON "subscription_renewals"("clientId")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX "subscription_balance_alerts_accountId_resolved_idx" ON "subscription_balance_alerts"("accountId", "resolved")`);
        
        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();
