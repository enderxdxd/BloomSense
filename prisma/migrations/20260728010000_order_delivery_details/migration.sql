-- AlterTable: order money breakdown + delivery details
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressLine1" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "giftMessage" TEXT;

-- Backfill: existing orders had no fee, so subtotal equals total.
UPDATE "Order" SET "subtotal" = "total" WHERE "subtotal" = 0;
