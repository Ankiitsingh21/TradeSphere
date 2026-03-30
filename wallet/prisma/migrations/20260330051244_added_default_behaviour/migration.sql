-- AlterTable
ALTER TABLE "wallet" ALTER COLUMN "total_balance" SET DEFAULT 0.0,
ALTER COLUMN "available_balance" SET DEFAULT 0.0,
ALTER COLUMN "locked_balance" SET DEFAULT 0.0,
ALTER COLUMN "version" SET DEFAULT 0;
