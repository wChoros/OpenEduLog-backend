import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authorize } from '../middleware/authorize'

const gradesRouter = express.Router()
const prisma = new PrismaClient()

gradesRouter.get(
   '/:studentId',
   authorize('readMany', 'Grade', (req) => Number(req.params.studentId)),
   async (req, res) => {
      const { studentId } = req.params

      try {
         const grades = await prisma.grade.findMany({
            where: {
               studentId: Number(studentId),
            },
            include: {
               subjectOnTeacher: {
                  include: {
                     subject: true, // Include the subject info in the response
                  },
               },
            },
         })

         const response = grades.map((grade) => ({
            id: grade.id,
            value: grade.value,
            weight: grade.weight,
            subjectName: grade.subjectOnTeacher.subject.name,
         }))

         res.json(response) // Send the response to the client
      } catch (error) {
         console.error(error)
         res.status(500).json({ error: 'Internal server error' })
      }
   }
)

//to authorize
gradesRouter.get(
   '/details/:gradeId',
   authorize('read', 'Grade'),
   async (req: Request, res: Response) => {
      const gradeId = req.params.gradeId

      // check if grade exists
      const grade = await prisma.grade.findFirst({
         where: {
            id: parseInt(gradeId),
         },
         include: {
            subjectOnTeacher: {
               include: {
                  teacher: true,
                  subject: true,
               },
            },
         },
      })
      if (!grade) {
         res.status(404).json({ message: 'Grade not found' })
         return
      }

      const gradeDetails = {
         id: grade.id,
         value: grade.value,
         description: grade.description,
         weight: grade.weight,
         subjectName: grade.subjectOnTeacher.subject.name,
         subjectId: grade.subjectOnTeacher.subjectId,
         teacherFirstName: grade.subjectOnTeacher.teacher.firstName,
         teacherLastName: grade.subjectOnTeacher.teacher.lastName,
         teacherId: grade.subjectOnTeacher.teacherId,
         addedAt: grade.createdAt,
         updatedAt: grade.updatedAt,
      }

      res.json(gradeDetails)
      return
   }
)

//to authorize
gradesRouter.post(
   '/:studentId/:teacherOnSubjectId/:value',
   authorize('add', 'Grade'),
   async (req: Request, res: Response) => {
      const { studentId, teacherOnSubjectId, value, description, weight } = req.params

      await prisma.grade.create({
         data: {
            studentId: parseInt(studentId),
            subjectOnTeacherId: parseInt(teacherOnSubjectId),
            value: parseInt(value),
            description: description,
            weight: parseInt(weight),
         },
      })
      res.json({ message: 'Grade added' })
      return
   }
)

//to authorize
gradesRouter.delete(
   '/:gradeId',
   authorize('delete', 'Grade'),
   async (req: Request, res: Response) => {
      const gradeId = req.params.gradeId

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

      await prisma.grade.delete({
         where: {
            id: parseInt(gradeId),
         },
      })
   }
)

//to authorize
gradesRouter.put(
   '/:gradeId/:newValue',
   authorize('update', 'Grade'),
   async (req: Request, res: Response) => {
      const { gradeId, newValue } = req.params

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

      await prisma.grade.update({
         where: {
            id: parseInt(gradeId),
         },
         data: {
            value: parseInt(newValue),
         },
      })

      res.json({ message: 'Grade updated' })
   }
)

export default gradesRouter
