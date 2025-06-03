/*
  Warnings:

  - The primary key for the `GroupsOnSubjectsOnTeachers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `subjectId` on the `GroupsOnSubjectsOnTeachers` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `GroupsOnSubjectsOnTeachers` table. All the data in the column will be lost.
  - Added the required column `subjectOnTeacherId` to the `GroupsOnSubjectsOnTeachers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GroupsOnSubjectsOnTeachers" DROP CONSTRAINT "GroupsOnSubjectsOnTeachers_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "GroupsOnSubjectsOnTeachers" DROP CONSTRAINT "GroupsOnSubjectsOnTeachers_teacherId_fkey";

-- AlterTable
ALTER TABLE "GroupsOnSubjectsOnTeachers" DROP CONSTRAINT "GroupsOnSubjectsOnTeachers_pkey",
DROP COLUMN "subjectId",
DROP COLUMN "teacherId",
ADD COLUMN     "subjectOnTeacherId" INTEGER NOT NULL,
ADD CONSTRAINT "GroupsOnSubjectsOnTeachers_pkey" PRIMARY KEY ("groupId", "subjectOnTeacherId");

-- AddForeignKey
ALTER TABLE "GroupsOnSubjectsOnTeachers" ADD CONSTRAINT "GroupsOnSubjectsOnTeachers_subjectOnTeacherId_fkey" FOREIGN KEY ("subjectOnTeacherId") REFERENCES "SubjectsOnTeachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
