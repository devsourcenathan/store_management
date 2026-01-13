-- Manual migration to fix existing data issues

-- 1. Create StockMovementSource enum
CREATE TYPE "StockMovementSource" AS ENUM ('SALE', 'SUPPLY', 'RETURN', 'MANUAL');

-- 2. Add source column to stock_movements as nullable with default
ALTER TABLE "stock_movements" ADD COLUMN "source" "StockMovementSource" DEFAULT 'MANUAL';

-- 3. Make source NOT NULL
ALTER TABLE "stock_movements" ALTER COLUMN "source" SET NOT NULL;

-- 4. Remove default after backfill
ALTER TABLE "stock_movements" ALTER COLUMN "source" DROP DEFAULT;

-- 5. Add duration to subscription_offers with default
ALTER TABLE "subscription_offers" ADD COLUMN "duration" INTEGER DEFAULT 30 NOT NULL;

-- 6. Remove default after backfill
ALTER TABLE "subscription_offers" ALTER COLUMN "duration" DROP DEFAULT;

-- 7. Create BalanceAlertType enum
CREATE TYPE "BalanceAlertType" AS ENUM ('NEGATIVE', 'LOW_BALANCE');

-- 8. Create subscription_renewals table
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
);

-- 9. Create subscription_balance_alerts table
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
);

-- 10. Create indexes
CREATE INDEX "subscription_renewals_subscriptionId_createdAt_idx" ON "subscription_renewals"("subscriptionId", "createdAt");

CREATE INDEX "subscription_renewals_clientId_idx" ON "subscription_renewals"("clientId");

CREATE INDEX "subscription_balance_alerts_accountId_resolved_idx" ON "subscription_balance_alerts"("accountId", "resolved");
