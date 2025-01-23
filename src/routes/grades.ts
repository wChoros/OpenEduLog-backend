import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import User from '../types/user'

const gradesRouter = express.Router()
const prisma = new PrismaClient()

gradesRouter.get(
   'grades/:studentId/:teacherOnSubjectId',
   async (req: Request, res: Response) => {
      const { studentId, subjectOnTeacherId } = req.params

      const user: User = req.body.user

      // student can only see their own grades
      if (user.role == 'student' && user.id !== parseInt(studentId)) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // teacher can only see grades of their students on their subjects
      if (user.role == 'teacher') {
         const teacherOnSubject = await prisma.subjectsOnTeachers.findFirst({
            where: {
               id: parseInt(subjectOnTeacherId),
               teacherId: user.id,
            },
         })
         if (!teacherOnSubject) {
            res.status(403).json({ message: 'Forbidden' })
            return
         }
      }

      // admin can see all grades

      const grades = await prisma.grade.findMany({
         where: {
            studentId: parseInt(studentId),
            subjectOnTeacherId: parseInt(subjectOnTeacherId),
         },
      })
      res.json(grades)
      return
   }
)

gradesRouter.get('grades/:studentId', async (req: Request, res: Response) => {
   const { studentId } = req.params

   const user: User = req.body.user

   // student can only see their own grades
   if (user.role == 'student' && user.id !== parseInt(studentId)) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // teacher can only see grades of their students on their subjects
   if (user.role == 'teacher') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // admin can see all grades

   const grades = await prisma.grade.findMany({
      where: {
         studentId: parseInt(studentId),
      },
   })
   res.json(grades)
   return
})

gradesRouter.post('grades/:studentId/:teacherOnSubjectId/:value', async (req: Request, res: Response) => {
   const { studentId, teacherOnSubjectId, value } = req.params

   const user: User = req.body.user

   // teacher can only add grades to their students on their subjects
   if (user.role == 'teacher') {
      const teacherOnSubject = await prisma.subjectsOnTeachers.findFirst({
         where: {
            id: parseInt(teacherOnSubjectId),
            teacherId: user.id,
         },
      })
      if (!teacherOnSubject) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }
   }

   if (user.role == 'student') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // admin can add grades to any student on any subject

   await prisma.grade.create({
      data: {
         studentId: parseInt(studentId),
         subjectOnTeacherId: parseInt(teacherOnSubjectId),
         value: parseInt(value),
      },
   })
   res.json({ message: 'Grade added' })
   return
})