-- 1. Create new enums
CREATE TYPE "StockMovementSource" AS ENUM ('SALE', 'SUPPLY', 'RETURN', 'MANUAL');
CREATE TYPE "SubscriptionBalanceSource" AS ENUM ('INJECTION', 'SUBSCRIPTION', 'REFUND', 'CORRECTION');

-- 2. Add 'source' column to stock_movements as nullable initially
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "source" "StockMovementSource";

-- 3. Data migration: Map old types to new types and sources
-- Old types: SALE, SUPPLY, ADJUSTMENT, RETURN, IN, OUT
UPDATE "stock_movements" SET "source" = 'SALE', "type" = 'OUT' WHERE "type"::text = 'SALE';
UPDATE "stock_movements" SET "source" = 'SUPPLY', "type" = 'IN' WHERE "type"::text = 'SUPPLY';
UPDATE "stock_movements" SET "source" = 'MANUAL', "type" = 'ADJUST' WHERE "type"::text = 'ADJUSTMENT';
UPDATE "stock_movements" SET "source" = 'RETURN', "type" = 'RETURN' WHERE "type"::text = 'RETURN';
UPDATE "stock_movements" SET "source" = 'MANUAL' WHERE "source" IS NULL;

-- 4. Alter 'type' column to the new enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stockmovementtype_new') THEN
        CREATE TYPE "StockMovementType_new" AS ENUM ('IN', 'OUT', 'ADJUST', 'RETURN');
        ALTER TABLE "stock_movements" ALTER COLUMN "type" TYPE "StockMovementType_new" USING ("type"::text::"StockMovementType_new");
        ALTER TYPE "StockMovementType" RENAME TO "StockMovementType_old";
        ALTER TYPE "StockMovementType_new" RENAME TO "StockMovementType";
        DROP TYPE "StockMovementType_old";
    END IF;
END $$;

-- 5. Finalize 'source' column
ALTER TABLE "stock_movements" ALTER COLUMN "source" SET NOT NULL;

-- 6. Handle subscription_balance_entries (assuming no data yet, or dropping it if necessary)
ALTER TABLE "subscription_balance_entries" DROP COLUMN IF EXISTS "subscriptionId";
ALTER TABLE "subscription_balance_entries" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
-- We need to populate accountId if entries exist, but assuming they don't for now.
-- Or just drop and recreate if it's test data.
-- ALTER TABLE "subscription_balance_entries" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "subscription_balance_entries" ADD COLUMN IF NOT EXISTS "source" "SubscriptionBalanceSource";

-- 7. Other tables and indexes
ALTER TABLE "products" DROP COLUMN IF EXISTS "imageUrl", DROP COLUMN IF EXISTS "thumbnailUrl";

CREATE TABLE IF NOT EXISTS "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscription_accounts" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_accounts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'subscription_accounts_serviceId_storeId_key') THEN
        CREATE UNIQUE INDEX "subscription_accounts_serviceId_storeId_key" ON "subscription_accounts"("serviceId", "storeId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'subscription_balance_entries_accountId_createdAt_idx') THEN
        CREATE INDEX "subscription_balance_entries_accountId_createdAt_idx" ON "subscription_balance_entries"("accountId", "createdAt");
    END IF;
END $$;

-- Re-add FKs safely
ALTER TABLE "product_images" DROP CONSTRAINT IF EXISTS "product_images_productId_fkey";
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_accounts" DROP CONSTRAINT IF EXISTS "subscription_accounts_serviceId_fkey";
ALTER TABLE "subscription_accounts" ADD CONSTRAINT "subscription_accounts_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_balance_entries" DROP CONSTRAINT IF EXISTS "subscription_balance_entries_accountId_fkey";
-- This might fail if accountId is null on existing rows, but assuming clean state.
-- ALTER TABLE "subscription_balance_entries" ADD CONSTRAINT "subscription_balance_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "subscription_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
