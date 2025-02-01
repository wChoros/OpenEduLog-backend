-- CreateEnum
CREATE TYPE "WeekDays" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "Timetable" (
    "id" SERIAL NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekDay" "WeekDays" NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "subjectOnTeacherId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "substitutionTeacherId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_subjectOnTeacherId_fkey" FOREIGN KEY ("subjectOnTeacherId") REFERENCES "SubjectsOnTeachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_substitutionTeacherId_fkey" FOREIGN KEY ("substitutionTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
