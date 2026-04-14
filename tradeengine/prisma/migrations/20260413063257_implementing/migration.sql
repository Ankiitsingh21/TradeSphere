/*
  Warnings:

  - Added the required column `expiresAt` to the `orderBook` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orderBook" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL;
