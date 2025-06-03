/* eslint-disable @typescript-eslint/no-explicit-any */
import {
   AbilityBuilder,
   AbilityClass,
   PureAbility,
   InferSubjects,
   ConditionsMatcher,
} from '@casl/ability'
import { User } from '@prisma/client'

export type Actions =
   | 'manage'
   | 'read'
   | 'create'
   | 'update'
   | 'delete'
   | 'add'
   | 'addTo'
   | 'removeFrom'
   | 'restore'
   | 'all'

export type Subjects =
   | InferSubjects<'User' | 'Session' | 'Subject' | 'Group' | 'Grade' | 'Timetable'>
   | 'all'

export type AppAbility = PureAbility<[Actions, Subjects]>

export function defineAbilitiesFor(user: User) {
   const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      PureAbility as AbilityClass<AppAbility>
   )

   if (user.role === 'ADMIN') {
      can('manage', 'all') // Full access
   } else if (user.role === 'STUDENT') {
      can('read', 'Grade', { studentId: user.id })
      can('read', 'Group', { studentId: user.id })
      can('read', 'Subject')
      can('read', 'Timetable', { groupId: user.id })
   } else if (user.role === 'TEACHER') {
      can('read', 'Group', { teacherId: user.id })
      can('read', 'Subject', { teacherId: user.id })
      can('read', 'Timetable', { teacherId: user.id })
      can(['add', 'update', 'delete'], 'Grade', { teacherId: user.id })
   } else {
      cannot('manage', 'all') // No access
   }

   const conditionsMatcher: ConditionsMatcher<any> =
      (conditions: Record<string, any>) => (subject) => {
         return Object.keys(conditions).every((key) => {
            return subject[key] === conditions[key]
         })
      }

   return build({
      detectSubjectType: (item) => {
         if ('email' in item && 'role' in item) return 'User'
         if ('gradeValue' in item && 'studentId' in item) return 'Grade'
         if ('groupName' in item && 'studentId' in item) return 'Group'
         if ('schedule' in item) return 'Timetable'
         if ('subjectName' in item) return 'Subject'
         return 'all'
      },
      conditionsMatcher,
   })
}
