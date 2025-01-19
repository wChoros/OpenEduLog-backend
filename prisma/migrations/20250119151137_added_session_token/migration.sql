/*
  Warnings:

  - You are about to drop the column `session` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sessionToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "session",
ADD COLUMN     "sessionToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_sessionToken_key" ON "User"("sessionToken");
