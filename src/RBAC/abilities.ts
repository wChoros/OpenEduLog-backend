import {
   AbilityBuilder,
   AbilityClass,
   PureAbility,
   InferSubjects,
} from '@casl/ability';
import { User} from '@prisma/client';

export type Actions =
   | 'manage' | 'read' | 'create' | 'update' | 'delete'
   | 'readGrades' | 'addGrades' | 'deleteGrades' | 'updateGrades'
   | 'readGroups' | 'createGroups' | 'deleteGroups' | 'addStudentToGroups'
   | 'addTeacherToGroups' | 'deleteStudentsFromGroups' | 'deleteTeacherFromGroups'
   | 'readSubjects' | 'createSubject' | 'deleteSubject' | 'updateSubject'
   | 'readTimetable' | 'createTimetable' | 'substituteTimetable'
   | 'cancelTimetable' | 'restoreTimetable' | 'updateTimetable' | 'deleteTimetable'
   | 'all';

export type Subjects = InferSubjects<'User' | 'Session' | 'Subject' | 'Group' | 'Grade' | 'Timetable'> | 'all';

export type AppAbility = PureAbility<[Actions, Subjects]>;

export function defineAbilitiesFor(user: User) {
   const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility as AbilityClass<AppAbility>);

   if (user.role === 'ADMIN') {
      can('manage', 'all'); // Full access
   }
   else if (user.role === 'STUDENT') {
      can(['readGrades', 'readGroups', 'readSubjects', 'readTimetable'], 'User', { id: user.id });
      can('read', 'Grade', { studentId: user.id });
      can('read', 'Group', { studentId: user.id });
   }
   else if (user.role === 'TEACHER') {
      can(['readGroups', 'readSubjects', 'readTimetable'], 'User', { id: user.id });
      can(['addGrades', 'updateGrades', 'deleteGrades'], 'Grade', { teacherId: user.id });
   }
   else {
      cannot('manage', 'all'); // No access
   }

   return build({
      detectSubjectType: (item) => {
         if ('email' in item) return 'User';
         if ('gradeValue' in item) return 'Grade';
         if ('groupName' in item) return 'Group';
         if ('schedule' in item) return 'Timetable';
         return 'all';
      },
   });
}
