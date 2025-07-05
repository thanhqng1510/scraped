/*
  Warnings:

  - You are about to drop the column `revokedAt` on the `ApiKey` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "revokedAt",
ADD COLUMN     "expiresAt" TIMESTAMP(3);
