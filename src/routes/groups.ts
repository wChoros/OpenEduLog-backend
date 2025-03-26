import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authorize } from '../middleware/authorize'

const groupsRouter = express.Router()
const prisma = new PrismaClient()

// get groups for student
groupsRouter.get(
   '/student/:studentId',
   authorize('read', 'Group'),
   async (req: Request, res: Response) => {
      const { studentId } = req.params

      // get groups for student

      const groups = await prisma.group.findMany({
         where: {
            StudentsOnGroups: {
               some: {
                  studentId: parseInt(studentId),
               },
            },
         },
      })

      res.status(200).json(groups)
   }
)

// get groups for teacher
groupsRouter.get(
   '/teacher/:teacherId',
   authorize('read', 'Group'),
   async (req: Request, res: Response) => {
      const { teacherId } = req.params

      const groups = await prisma.group.findMany({
         where: {
            GroupsOnSubjectsOnTeachers: {
               some: {
                  subjectOnTeacher: {
                     teacherId: parseInt(teacherId),
                  },
               },
            },
         },
      })

      res.status(200).json(groups)
   }
)

groupsRouter.post('/create', authorize('create', 'Group'), async (req: Request, res: Response) => {
   const { name } = req.body

   const group = await prisma.group.create({
      data: {
         name,
      },
   })

   res.status(201).json(group)
})

groupsRouter.delete(
   '/delete',
   authorize('delete', 'Group'),
   async (req: Request, res: Response) => {
      const { groupId } = req.body

      await prisma.studentsOnGroups.deleteMany({
         where: {
            groupId: groupId,
         },
      })

      await prisma.group.delete({
         where: {
            id: groupId,
         },
      })

      res.status(204).json({ message: 'Group deleted' })
   }
)

groupsRouter.post(
   '/add-student',
   authorize('addTo', 'Group'),
   async (req: Request, res: Response) => {
      const { studentId, groupId } = req.body

      const studentOnGroup = await prisma.studentsOnGroups.create({
         data: {
            studentId,
            groupId,
         },
      })

      res.status(201).json(studentOnGroup)
   }
)

groupsRouter.post(
   '/add-teacher',
   authorize('addTo', 'Group'),
   async (req: Request, res: Response) => {
      const { teacherId, groupId, subjectId } = req.body

      // check if teacher is teaching the subject
      const SubjectOnTeacher = await prisma.subjectsOnTeachers.findFirst({
         where: {
            teacherId: parseInt(teacherId),
            subjectId: parseInt(subjectId),
         },
      })
      if (!SubjectOnTeacher) {
         res.status(403).json({ message: 'Teacher is not teaching this subject' })
         return
      }

      const teacherOnGroup = await prisma.groupsOnSubjectsOnTeachers.create({
         data: {
            subjectOnTeacherId: SubjectOnTeacher.id,
            groupId: parseInt(groupId),
         },
      })

      res.status(201).json(teacherOnGroup)
   }
)

groupsRouter.delete(
   '/remove-student',
   authorize('removeFrom', 'Group'),
   async (req: Request, res: Response) => {
      const { studentId, groupId } = req.body

      await prisma.studentsOnGroups.deleteMany({
         where: {
            studentId,
            groupId,
         },
      })

      res.status(204).json({ message: 'Student removed from group' })
   }
)

groupsRouter.delete(
   '/remove-teacher',
   authorize('removeFrom', 'Group'),
   async (req: Request, res: Response) => {
      const { teacherId, groupId, subjectId } = req.body

      const subjectOnTeacher = await prisma.subjectsOnTeachers.findFirst({
         where: {
            teacherId: teacherId,
            subjectId: subjectId,
         },
      })

      if (!subjectOnTeacher) {
         res.status(404).json({ message: 'Teacher is not teaching this subject' })
         return
      }

      await prisma.groupsOnSubjectsOnTeachers.deleteMany({
         where: {
            subjectOnTeacherId: subjectOnTeacher.id,
            groupId: groupId,
         },
      })

      res.status(204).json({ message: 'Teacher removed from group' })
   }
)

export default groupsRouter
