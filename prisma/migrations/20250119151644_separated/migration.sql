/*
  Warnings:

  - You are about to drop the column `sessionExpires` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `sessionToken` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_sessionToken_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "sessionExpires",
DROP COLUMN "sessionToken";

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
