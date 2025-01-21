/*
  Warnings:

  - Added the required column `session` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionExpires` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "session" TEXT NOT NULL,
ADD COLUMN     "sessionExpires" TIMESTAMP(3) NOT NULL;
