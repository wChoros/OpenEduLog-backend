// seed.ts
import { PrismaClient, Roles, WeekDays, SubjectsOnTeachers, User, Address, Subject, Group, Message, GroupsOnSubjectsOnTeachers } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// --- Configuration for data generation ---
const NUM_ADDRESSES = 50;
const NUM_USERS = 40; // 5 ADMIN, 10 TEACHER, 25 STUDENT
const NUM_SUBJECTS = 10;
const NUM_GROUPS = 5;
const MAX_SESSIONS_PER_USER = 2;
const MAX_SUBJECTS_PER_TEACHER = 3;
const MAX_GRADES_PER_STUDENT_SUBJECT = 3;
const MAX_LESSONS_PER_DAY_PER_GROUP = 5; // Max lessons a group has on a scheduled day
const MAX_ANNOUNCEMENTS_PER_AUTHOR = 2;
const MAX_MESSAGES_PER_AUTHOR = 3;
const MAX_RECEIVERS_PER_MESSAGE = 5;
const MAX_SUBJECTS_TAUGHT_IN_GROUP = 4;
const BCRYPT_SALT_ROUNDS = 10;
const TIMETABLE_WEEKS_TO_SCHEDULE = 3; // e.g., Current week + next 2 weeks

// --- Helper Functions ---
function getRandomEnumValue<T extends Record<string, string>>(enumObj: T): T[keyof T] {
  const enumValues = Object.values(enumObj) as T[keyof T][];
  return faker.helpers.arrayElement(enumValues);
}

function capitalizeWords(str: string): string {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Calculates the ISO 8601 week number for a given date.
 * @param date The date for which to calculate the week number.
 * @returns The ISO week number (1-53).
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // getUTCDay() is 0 (Sunday) to 6 (Saturday)
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Shift to Thursday of the same week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate the number of days between yearStart and d, then divide by 7
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
}


async function clearDatabase() {
  console.log('Clearing existing data...');
  await prisma.usersOnMessages.deleteMany({});
  await prisma.groupsOnSubjectsOnTeachers.deleteMany({});
  await prisma.timetable.deleteMany({});
  await prisma.grade.deleteMany({});
  await prisma.studentsOnGroups.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.subjectsOnTeachers.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.subject.deleteMany({});
  console.log('Database cleared.');
}

async function main() {
  console.log('Starting database seeding...');

  // Optional: Clear database before seeding
  await clearDatabase();

  const addresses: Address[] = [];
  for (let i = 0; i < NUM_ADDRESSES; i++) {
    const address = await prisma.address.create({
      data: {
        street: faker.location.streetAddress(false),
        house: faker.location.buildingNumber(),
        city: faker.location.city(),
        zip: faker.location.zipCode(),
        country: faker.location.country(),
      },
    });
    addresses.push(address);
  }
  console.log(`Created ${addresses.length} addresses.`);

  const subjects: Subject[] = [];
  for (let i = 0; i < NUM_SUBJECTS; i++) {
    const rawSubjectName = faker.word.words({ count: { min: 1, max: 3 } });
    const subject = await prisma.subject.create({
      data: { name: capitalizeWords(rawSubjectName) },
    });
    subjects.push(subject);
  }
  console.log(`Created ${subjects.length} subjects.`);

  const groups: Group[] = [];
  for (let i = 0; i < NUM_GROUPS; i++) {
    const rawGroupName = `${faker.word.adjective()} ${faker.word.noun()}s ${faker.number.int({ min: 1, max: 10 }) }${faker.string.alpha(1).toUpperCase()}`;
    const group = await prisma.group.create({
      data: { name: capitalizeWords(rawGroupName) },
    });
    groups.push(group);
  }
  console.log(`Created ${groups.length} groups.`);

  const users: User[] = [];
  const usedEmails = new Set<string>();
  const usedLogins = new Set<string>();

  for (let i = 0; i < NUM_USERS; i++) {
    let role: Roles;
    if (i < 5) role = Roles.ADMIN;
    else if (i < 15) role = Roles.TEACHER;
    else role = Roles.STUDENT;

    let email = faker.internet.email();
    while (usedEmails.has(email)) email = faker.internet.email();
    usedEmails.add(email);

    let login = faker.internet.username().toLowerCase().replace(/[^a-z0-9_.]/gi, '_') + faker.number.int({min:10, max:99});
    while (usedLogins.has(login)) login = faker.internet.username().toLowerCase().replace(/[^a-z0-9_.]/gi, '_') + faker.number.int({min:10, max:99});
    usedLogins.add(login);

    const hashedPassword = await bcrypt.hash("123", BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: email,
        login: login,
        password: hashedPassword,
        isEmailConfirmed: faker.datatype.boolean({ probability: 0.8 }),
        phoneNumber: faker.helpers.maybe(() => faker.phone.number(), { probability: 0.7 }),
        birthDate: faker.date.past({ years: role === Roles.STUDENT ? 20 : 45, refDate: role === Roles.STUDENT ? new Date(2006,0,1) : new Date(1980,0,1) }),
        addressId: faker.helpers.arrayElement(addresses).id,
        role: role,
      },
    });
    users.push(user);
  }
  console.log(`Created ${users.length} users with hashed passwords.`);
  const adminUsers = users.filter(u => u.role === Roles.ADMIN);
  const teacherUsers = users.filter(u => u.role === Roles.TEACHER);
  const studentUsers = users.filter(u => u.role === Roles.STUDENT);
  console.log(`Admins: ${adminUsers.length}, Teachers: ${teacherUsers.length}, Students: ${studentUsers.length}`);

  for (const user of users) {
    const numSessions = faker.number.int({ min: 0, max: MAX_SESSIONS_PER_USER });
    for (let i = 0; i < numSessions; i++) {
      await prisma.session.create({
        data: {
          token: faker.string.uuid(),
          expiredAt: faker.date.future({ years: 1 }),
          userId: user.id,
        },
      });
    }
  }
  console.log(`Created sessions for users.`);

  const subjectsOnTeachers: SubjectsOnTeachers[] = [];
  if (teacherUsers.length > 0 && subjects.length > 0) {
    for (const teacher of teacherUsers) {
      const numSubjectsToTeach = faker.number.int({ min: 1, max: Math.min(MAX_SUBJECTS_PER_TEACHER, subjects.length) });
      const availableSubjects = [...subjects];
      for (let i = 0; i < numSubjectsToTeach; i++) {
        if (availableSubjects.length === 0) break;
        const randomSubjectIndex = faker.number.int({min: 0, max: availableSubjects.length -1 });
        const subjectToTeach = availableSubjects.splice(randomSubjectIndex, 1)[0];
        const existing = subjectsOnTeachers.find(sot => sot.teacherId === teacher.id && sot.subjectId === subjectToTeach.id);
        if (!existing) {
            const sot = await prisma.subjectsOnTeachers.create({
                data: { subjectId: subjectToTeach.id, teacherId: teacher.id },
            });
            subjectsOnTeachers.push(sot);
        }
      }
    }
  }
  console.log(`Created ${subjectsOnTeachers.length} teacher-subject assignments.`);

  if (studentUsers.length > 0 && groups.length > 0) {
    for (const student of studentUsers) {
      await prisma.studentsOnGroups.create({
        data: {
          studentId: student.id,
          groupId: faker.helpers.arrayElement(groups).id,
        },
      });
    }
  }
  console.log(`Assigned students to groups.`);

  if (studentUsers.length > 0 && subjectsOnTeachers.length > 0) {
    for (const student of studentUsers) {
      const numSubjectsToGrade = faker.number.int({ min: 1, max: Math.min(subjectsOnTeachers.length, 5) });
      const SOTsForStudent = faker.helpers.arrayElements(subjectsOnTeachers, numSubjectsToGrade);
      for (const sot of SOTsForStudent) {
        const numGrades = faker.number.int({ min: 1, max: MAX_GRADES_PER_STUDENT_SUBJECT });
        for (let i = 0; i < numGrades; i++) {
          await prisma.grade.create({
            data: {
              value: faker.number.float({ min: 1, max: 6, multipleOf: 0.5 }),
              description: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
              weight: faker.number.int({ min: 1, max: 3 }),
              studentId: student.id,
              subjectOnTeacherId: sot.id,
            },
          });
        }
      }
    }
  }
  console.log(`Created grades for students.`);

  // --- 9. Create Timetable & GroupsOnSubjectsOnTeachers (Updated for current dates) ---
  if (groups.length > 0 && subjectsOnTeachers.length > 0 && teacherUsers.length > 0) {
    const weekDaysForLessons = Object.values(WeekDays).filter(wd => wd !== WeekDays.SATURDAY && wd !== WeekDays.SUNDAY);

    const today = new Date();
    const currentWeekNumber = getISOWeek(today);
    const weeksForTimetable: number[] = [];

    for (let i = 0; i < TIMETABLE_WEEKS_TO_SCHEDULE; i++) {
        let week = currentWeekNumber + i;
        // Basic wrapping for week numbers (ISO weeks can go up to 53)
        // This simple logic assumes a 52-week year for wrapping.
        // A more precise solution would consider the exact number of weeks in the current/next year.
        if (week > 52) {
            week = (week % 52 === 0) ? 52 : week % 52;
        }
        if (!weeksForTimetable.includes(week)) { // Avoid duplicates if TIMETABLE_WEEKS_TO_SCHEDULE is large and wraps
            weeksForTimetable.push(week);
        }
    }
    console.log(`Scheduling timetable for weeks: ${weeksForTimetable.join(', ')}`);


    for (const group of groups) {
      const groupSOTsLiaison: GroupsOnSubjectsOnTeachers[] = [];
      const numSOTsForGroup = faker.number.int({min:1, max: Math.min(MAX_SUBJECTS_TAUGHT_IN_GROUP, subjectsOnTeachers.length)});
      const availableSOTsForGroupAssignment = [...subjectsOnTeachers];

      for(let i=0; i < numSOTsForGroup; i++){
        if(availableSOTsForGroupAssignment.length === 0) break;
        const randomSOTIndex = faker.number.int({min: 0, max: availableSOTsForGroupAssignment.length - 1});
        const sotToAssign = availableSOTsForGroupAssignment.splice(randomSOTIndex, 1)[0];
        const existingGost = await prisma.groupsOnSubjectsOnTeachers.findUnique({
            where: { groupId_subjectOnTeacherId: { groupId: group.id, subjectOnTeacherId: sotToAssign.id }}
        });
        if (!existingGost) {
            const gost = await prisma.groupsOnSubjectsOnTeachers.create({
              data: { groupId: group.id, subjectOnTeacherId: sotToAssign.id }
            });
            groupSOTsLiaison.push(gost);
        }
      }

      if (groupSOTsLiaison.length === 0 && subjectsOnTeachers.length > 0) {
        const fallbackSot = faker.helpers.arrayElement(subjectsOnTeachers);
        const existingGost = await prisma.groupsOnSubjectsOnTeachers.findUnique({
            where: { groupId_subjectOnTeacherId: { groupId: group.id, subjectOnTeacherId: fallbackSot.id }}
        });
        if (!existingGost) {
            const gost = await prisma.groupsOnSubjectsOnTeachers.create({
                data: { groupId: group.id, subjectOnTeacherId: fallbackSot.id }
              });
            groupSOTsLiaison.push(gost);
        }
      }

      if (groupSOTsLiaison.length > 0) {
        for (const weekNumberToSchedule of weeksForTimetable) {
          for (const weekDay of weekDaysForLessons) {
            const numLessonsThisDay = faker.number.int({ min: 1, max: MAX_LESSONS_PER_DAY_PER_GROUP });
            for (let lesson = 1; lesson <= numLessonsThisDay; lesson++) {
              const randomGroupSOTLiaison = faker.helpers.arrayElement(groupSOTsLiaison);
              await prisma.timetable.create({
                data: {
                  weekNumber: weekNumberToSchedule,
                  weekDay: weekDay,
                  lessonNumber: lesson,
                  subjectOnTeacherId: randomGroupSOTLiaison.subjectOnTeacherId,
                  groupId: group.id,
                  substitutionTeacherId: faker.helpers.maybe(() => faker.helpers.arrayElement(teacherUsers).id, { probability: 0.1 }),
                  isCanceled: faker.datatype.boolean({ probability: 0.05 }),
                },
              });
            }
          }
        }
      }
    }
  }
  console.log(`Created timetable entries for weeks around the current date.`);

  const announcers = [...adminUsers, ...teacherUsers];
  if (announcers.length > 0) {
    for (const announcer of announcers) {
      const numAnnouncements = faker.number.int({ min: 0, max: MAX_ANNOUNCEMENTS_PER_AUTHOR });
      for (let i = 0; i < numAnnouncements; i++) {
        await prisma.announcement.create({
          data: {
            authorId: announcer.id,
            title: capitalizeWords(faker.lorem.sentence(5)),
            content: faker.lorem.paragraphs(2),
          },
        });
      }
    }
  }
  console.log(`Created announcements.`);

  if (users.length > 0) {
    for (const author of users) {
      const numMessages = faker.number.int({ min: 0, max: MAX_MESSAGES_PER_AUTHOR });
      for (let i = 0; i < numMessages; i++) {
        const message = await prisma.message.create({
          data: {
            authorId: author.id,
            title: capitalizeWords(faker.lorem.sentence(4)),
            content: faker.lorem.paragraph(),
          },
        });
        const numReceivers = faker.number.int({ min: 1, max: Math.min(MAX_RECEIVERS_PER_MESSAGE, users.length -1 ) });
        const potentialReceivers = users.filter(u => u.id !== author.id);
        if (potentialReceivers.length > 0) {
            const selectedReceivers = faker.helpers.arrayElements(potentialReceivers, Math.min(numReceivers, potentialReceivers.length));
            for (const receiver of selectedReceivers) {
              await prisma.usersOnMessages.create({
                data: {
                  userId: receiver.id,
                  messageId: message.id,
                  isRead: faker.datatype.boolean({ probability: 0.6 }),
                },
              });
            }
        }
      }
    }
  }
  console.log(`Created messages and assigned receivers.`);

  console.log('Database seeding finished successfully! 🎉');
}

main()
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });