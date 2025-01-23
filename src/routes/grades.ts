import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { User, Roles } from '@prisma/client'

const gradesRouter = express.Router()
const prisma = new PrismaClient()

gradesRouter.get('grades/:studentId/:teacherOnSubjectId', async (req: Request, res: Response) => {
   const { studentId, subjectOnTeacherId } = req.params
   const user: User = req.body.user

   // student can only see their own grades
   if (user.role == Roles.STUDENT && user.id !== parseInt(studentId)) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // teacher can only see grades of their students on their subjects
   if (user.role == Roles.TEACHER) {
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
})

gradesRouter.get('grades/:studentId', async (req: Request, res: Response) => {
   const { studentId } = req.params
   const user: User = req.body.user

   // student can only see their own grades
   if (user.role == Roles.STUDENT && user.id !== parseInt(studentId)) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // teacher can only see grades of their students on their subjects
   if (user.role == Roles.TEACHER) {
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

gradesRouter.post(
   'grades/:studentId/:teacherOnSubjectId/:value',
   async (req: Request, res: Response) => {
      const { studentId, teacherOnSubjectId, value } = req.params
      const user: User = req.body.user

      // teacher can only add grades to their students on their subjects
      if (user.role == Roles.TEACHER) {
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

      // student cannot add grades
      if (user.role == Roles.STUDENT) {
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
   }
)

gradesRouter.delete('grades/:gradeId', async (req: Request, res: Response) => {
   const gradeId = req.params.gradeId
   const user: User = req.body.user

   // check if grade exists
   const grade = await prisma.grade.findFirst({
      where: {
         id: parseInt(gradeId),
      },
   })
   if (!grade) {
      res.status(404).json({ message: 'Grade not found' })
      return
   }

   // student cannot delete grades
   if (user.role == Roles.STUDENT) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // teacher can only delete grades of their students on their subjects
   if (user.role == Roles.TEACHER) {
      const teacherOnSubject = await prisma.subjectsOnTeachers.findFirst({
         where: {
            id: grade.subjectOnTeacherId,
            teacherId: user.id,
         },
      })
      if (!teacherOnSubject) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }
   }

   // admin can delete any grade
   await prisma.grade.delete({
      where: {
         id: parseInt(gradeId),
      },
   })
})

gradesRouter.put('grades/:gradeId/:newValue', async (req: Request, res: Response) => {
   const { gradeId, newValue } = req.params
   const user: User = req.body.user

   // check if grade exists
   const grade = await prisma.grade.findFirst({
      where: {
         id: parseInt(gradeId),
      },
   })

   if (!grade) {
      res.status(404).json({ message: 'Grade not found' })
      return
   }

   // student cannot update grades
   if (user.role == Roles.STUDENT) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // teacher can only update grades of their students on their subjects
   if (user.role == Roles.TEACHER) {
      const teacherOnSubject = await prisma.subjectsOnTeachers.findFirst({
         where: {
            id: grade.subjectOnTeacherId,
            teacherId: user.id,
         },
      })
      if (!teacherOnSubject) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }
   }

   // admin can update any grade
   await prisma.grade.update({
      where: {
         id: parseInt(gradeId),
      },
      data: {
         value: parseInt(newValue),
      },
   })

   res.json({ message: 'Grade updated' })
})
