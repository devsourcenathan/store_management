const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createMissingTables() {
    try {
        console.log('Creating missing subscription_accounts table...');
        
        await prisma.$executeRawUnsafe(`
            CREATE TABLE "subscription_accounts" (
                "id" TEXT NOT NULL,
                "serviceId" TEXT NOT NULL,
                "storeId" TEXT NOT NULL,
                "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "subscription_accounts_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "subscription_accounts_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        
        console.log('Creating unique index on subscription_accounts...');
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX "subscription_accounts_serviceId_storeId_key" ON "subscription_accounts"("serviceId", "storeId")
        `);
        
        console.log('✅ subscription_accounts table created successfully!');
        
        // Now create subscription_balance_alerts which depends on it
        console.log('Creating subscription_balance_alerts table...');
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
        
        console.log('Creating index on subscription_balance_alerts...');
        await prisma.$executeRawUnsafe(`
            CREATE INDEX "subscription_balance_alerts_accountId_resolved_idx" ON "subscription_balance_alerts"("accountId", "resolved")
        `);
        
        console.log('✅ All missing tables created successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

createMissingTables();
