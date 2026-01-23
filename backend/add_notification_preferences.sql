-- Add email notification preference fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dailyReportEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "weeklyReportEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthlyReportEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "yearlyReportEnabled" BOOLEAN NOT NULL DEFAULT false;
