import { PrismaClient, Roles, WeekDays } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clear all data from all tables (in the right order to avoid foreign key violations)
  await prisma.$executeRaw`TRUNCATE TABLE "GroupsOnSubjectsOnTeachers" CASCADE;`
  await prisma.$executeRaw`TRUNCATE TABLE "StudentsOnGroups" CASCADE;`
  await prisma.$executeRaw`TRUNCATE TABLE "Grade" CASCADE;`
  await prisma.$executeRaw`TRUNCATE TABLE "Timetable" CASCADE;`
  await prisma.$executeRaw`TRUNCATE TABLE "SubjectsOnTeachers" CASCADE;`
  await prisma.$executeRaw`TRUNCATE TABLE "Session" CASCADE;`
  await prisma.$executeRaw`TRUNCATE TABLE "Group" CASCADE;`
  await prisma.$executeRaw`TRUNCATE TABLE "Subject" CASCADE;`
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE;`
  await prisma.$executeRaw`TRUNCATE TABLE "Address" CASCADE;`




  // Create Addresses
  const addresses = await prisma.address.createMany({
    data: Array.from({ length: 50 }, () => ({
      street: faker.location.street(),
      house: faker.string.alphanumeric(3),
      city: faker.location.city(),
      zip: faker.location.zipCode(),
      country: faker.location.country(),
    })),
  });

  const addressIds = (await prisma.address.findMany()).map((a) => a.id);

  const usersToAdd = [
    {
      firstName: 'Admin',
      lastName: 'User',
      login: 'Admin',
      password: 'Admin420',
      role: Roles.ADMIN,
    },
    {
      firstName: 'Student',
      lastName: 'User',
      login: 'Student',
      password: 'Student420',
      role: Roles.STUDENT,
    },
    {
      firstName: 'Teacher',
      lastName: 'User',
      login: 'Teacher',
      password: 'Teacher420',
      role: Roles.TEACHER,
    },
  ];

  for (const user of usersToAdd) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.create({
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        login: user.login,
        password: hashedPassword,
        role: user.role,
        email: faker.internet.email(),
        birthDate: faker.date.birthdate({ min: 1980, max: 2010, mode: 'year' }),
        addressId: faker.helpers.arrayElement(addressIds),
        isEmailConfirmed: true,
        phoneNumber: faker.phone.number(),
      },
    });
  }

  console.log('Admin, Student, and Teacher users added successfully!');
  console.log('Creating 100 random users...');


  // Create Users
  for (let i = 0; i < 100; i++) {

    const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const hashedPassword = await bcrypt.hash('meow', 10);

    await prisma.user.create({
      data: {
        firstName: firstName,
        lastName: lastName,
        email: faker.internet.email(),
        login: faker.internet.username({firstName: firstName, lastName: lastName}),
        password: hashedPassword,
        birthDate: faker.date.birthdate({ min: 1980, max: 2010, mode: 'year' }),
        role: faker.helpers.arrayElement(Object.values(Roles)),
        addressId: faker.helpers.arrayElement(addressIds),
        isEmailConfirmed: faker.datatype.boolean(),
        phoneNumber: faker.phone.number(),
      },
    });
  }

  const users = await prisma.user.findMany();
  const teachers = users.filter((u) => u.role === 'TEACHER');
  const students = users.filter((u) => u.role === 'STUDENT');

  // Create Subjects
  const subjects = await prisma.subject.createMany({
    data: Array.from({ length: 10 }, () => ({
      name: faker.word.words(2),
    })),
  });
  const subjectIds = (await prisma.subject.findMany()).map((s) => s.id);

  // Assign Subjects to Teachers
  const subjectsOnTeachers = [];
  for (const teacher of teachers) {
    const subjectOnTeacher = await prisma.subjectsOnTeachers.create({
      data: {
        subjectId: faker.helpers.arrayElement(subjectIds),
        teacherId: teacher.id,
      },
    });
    subjectsOnTeachers.push(subjectOnTeacher);
  }

  // Create Groups
  const groups = await prisma.group.createMany({
    data: Array.from({ length: 5 }, () => ({
      name: faker.word.words() + faker.number.int(100),
    })),
  });
  const groupIds = (await prisma.group.findMany()).map((g) => g.id);

  // Assign Students to Groups
  for (const student of students) {
    const existingAssignment = await prisma.studentsOnGroups.findFirst({
      where: {
        studentId: student.id,
        groupId: { in: groupIds }, // Check if the student is already assigned to any group
      },
    });

    if (!existingAssignment) {
      await prisma.studentsOnGroups.create({
        data: {
          groupId: faker.helpers.arrayElement(groupIds),
          studentId: student.id,
        },
      });
    }
  }

  // Create GroupsOnSubjectsOnTeachers
  for (const groupId of groupIds) {
    for (const subjectOnTeacher of subjectsOnTeachers) {
      await prisma.groupsOnSubjectsOnTeachers.create({
        data: {
          groupId,
          teacherId: subjectOnTeacher.teacherId,
          subjectId: subjectOnTeacher.subjectId,
        },
      });
    }
  }

  // Create Grades
  for (const student of students) {
    for (const subjectOnTeacher of subjectsOnTeachers) {
      await prisma.grade.create({
        data: {
          value: faker.number.int({ min: 1.0, max: 6.0 }),
          description: faker.lorem.sentence(),
          weight: faker.number.int({ min: 1, max: 5 }),
          studentId: student.id,
          subjectOnTeacherId: subjectOnTeacher.id,
        },
      });
    }
  }

  // Create Timetables
  for (const groupId of groupIds) {
    for (let week = 1; week <= 4; week++) {
      for (const day of Object.values(WeekDays)) {
        await prisma.timetable.create({
          data: {
            weekNumber: week,
            weekDay: day,
            lessonNumber: faker.number.int({ min: 0, max: 10 }),
            subjectOnTeacherId: faker.helpers.arrayElement(subjectsOnTeachers).id,
            groupId,
            isCanceled: faker.datatype.boolean(0.1),
            substitutionTeacherId: faker.datatype.boolean() ? faker.helpers.arrayElement(teachers).id : null,
          },
        });
      }
    }
  }
  //
  // // Create Sessions
  // for (const user of users) {
  //   await prisma.session.create({
  //     data: {
  //       token: faker.string.uuid(),
  //       expiredAt: faker.date.future(),
  //       userId: user.id,
  //     },
  //   });
  // }

  console.log('Database seeded successfully with all data!');

}

main()
   .catch((e) => {
     console.error(e);
     process.exit(1);
   })
   .finally(async () => {
     await prisma.$disconnect();
   });
