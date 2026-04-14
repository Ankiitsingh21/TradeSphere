/*
  Warnings:

  - You are about to drop the `orderBook` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "TradeStatus" ADD VALUE 'PARTIAL';

-- DropTable
DROP TABLE "orderBook";

-- CreateTable
CREATE TABLE "OrderBook" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "totalQuantity" DECIMAL(18,6) NOT NULL,
    "matchedQuantity" DECIMAL(18,6),
    "price" DECIMAL(18,6) NOT NULL,
    "type" "TradeType" NOT NULL,
    "status" "TradeStatus" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderBook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderBook_orderId_key" ON "OrderBook"("orderId");
