/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "wallet_userId_key" ON "wallet"("userId");
