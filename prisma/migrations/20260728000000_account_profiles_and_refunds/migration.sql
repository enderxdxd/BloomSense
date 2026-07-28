-- AlterEnum: add REFUNDED to OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

-- AlterTable: FloralProfile becomes one-to-many per user with saved payload
DROP INDEX IF EXISTS "FloralProfile_userId_key";
ALTER TABLE "FloralProfile" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'My floral profile';
ALTER TABLE "FloralProfile" ADD COLUMN IF NOT EXISTS "data" JSONB;
CREATE INDEX IF NOT EXISTS "FloralProfile_userId_idx" ON "FloralProfile"("userId");

-- AlterTable: Order refund bookkeeping
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripeRefundId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
