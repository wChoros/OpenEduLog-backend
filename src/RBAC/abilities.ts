import { defineAbility, InferSubjects } from '@casl/ability'

export type Actions =
   | 'manage'
   | 'read'
   | 'readMany'
   | 'update'
   | 'delete'
   | 'add'
   | 'addTo'
   | 'removeFrom'
   | 'restore'
   | 'all'

export type Subjects =
   | InferSubjects<'User' | 'Session' | 'Subject' | 'Group' | 'Grade' | 'Timetable' | 'Message'>
   | 'all'

export default (user: { id: number; role: string }, additionalData?:{id:number}) =>
   defineAbility((can, cannot) => {
      console.log('STUDENTID:  ', user.id)

      console.log(additionalData)

      if (user.role === 'ADMIN') {
         can('manage', 'all')
      } else if (user.role === 'STUDENT') {
         can('read', 'Grade', { studentId: user.id })
         can('readMany', 'Grade', { studentId: user.id })
         can('read', 'Group', { studentId: user.id })
         can('readMany', 'Group', { studentId: user.id })
         can('read', 'Subject', { studentId: user.id })
         can('readMany', 'Subject', { studentId: user.id })
         can('read', 'Timetable', { studentId: user.id })
         can('readMany', 'Timetable', { studentId: user.id })
         can('read', 'Message', { userId: user.id })
         can('readMany', 'Message', { authorId: user.id })
         can(['read', 'add', 'update', 'delete'], 'Message', { authorId: user.id })
      } else if (user.role === 'TEACHER') {
         can('read', 'Subject', { teacherId: user.id })
         can('readMany', 'Timetable', { teacherId: user.id })
         can('read', 'Timetable', { teacherId: user.id })
         can(['read', 'add', 'update', 'delete'], 'Grade', { teacherId: user.id })
         can('read', 'Group', { teacherId: user.id })
         can('read', 'Message', { userId: user.id })
         can(['read', 'add', 'update', 'delete'], 'Message', { authorId: user.id })
      } else {
         cannot('manage', 'all') // No access
      }})

//
// if (user.role === 'ADMIN') {
//    can('manage', 'all') // Full access
// } else if (user.role === 'STUDENT') {
//    can('read', 'Grade', { studentId: user.id })
//    can('read', 'Group', { studentsOnGroups: { some: { studentId: user.id } } })
//    can('readMany', 'Group', { studentId: user.id })
//    can('read', 'Subject', { SubjectsOnTeachers: { some: { GroupsOnSubjectsOnTeachers: { some: { group: { StudentsOnGroups: { some: { studentId: user.id } } } }, }, }, }, })
//    can('readMany', 'Subject', { some: {studentId: user.id }})
//    can('read', 'Timetable', { studentsOnGroups: { some: { studentId: user.id } } })
//    can('readMany', 'Timetable', { some: {studentId: user.id }})
//    can('read', 'Message', { receivers: { some: { userId: user.id } } })
//    can('readMany', 'Message', { some: {authorId: user.id} })
//    can(['read', 'add', 'update', 'delete'], 'Message', { authorId: user.id })
// } else if (user.role === 'TEACHER') {
//    can('read', 'Subject', { subjectsOnTeachers: { some: { teacherId: user.id } } })
//    can('readMany', 'Timetable', { some: {teacherId: user.id }})
//    can('read', 'Timetable', { subjectOnTeacher: { some: { teacherId: user.id } } })
//    can(['read', 'add', 'update', 'delete'], 'Grade', { subjectOnTeacher: { some: { teacherId: user.id } }})
//    can('read', 'Group', {GroupsOnSubjectsOnTeachers: { some: { subjectOnTeacher: { teacherId: user.id}}}})
//    can('read', 'Message', { receivers: { some: { userId: user.id } } })
//    can(['read', 'add', 'update', 'delete'], 'Message', { authorId: user.id })
// } else {
//    cannot('manage', 'all') // No access
// }