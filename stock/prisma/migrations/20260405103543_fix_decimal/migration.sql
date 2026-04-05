/*
  Warnings:

  - You are about to alter the column `price` on the `stock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,4)`.

*/
-- AlterTable
ALTER TABLE "stock" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,4);
