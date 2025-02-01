import express from 'express'
import { PrismaClient, User } from '@prisma/client'

const timetableRouter = express.Router()
const prisma = new PrismaClient()

timetableRouter.get('/user/:userId/:weekNumber', async (req, res) => {
   const { userId, weekNumber } = req.params
   const user: User = req.body.user

   try {
      // student and teachers can only see their own timetable
      if (user.role == 'STUDENT' || user.role == 'TEACHER') {
         if (user.id !== parseInt(userId)) {
            res.status(403).json({ message: 'Forbidden' })
            return
         }
      }

      // admin can see all timetables

      // get data from prisma for all groups that the user is either a teacher of or a student in
      const timetable = await prisma.timetable.findMany({
         where: {
            weekNumber: parseInt(weekNumber, 10),
         },
         include: {
            subjectOnTeacher: {
               include: {
                  subject: {
                     select: {
                        name: true,
                        id: true,
                     },
                  },
                  teacher: {
                     select: {
                        firstName: true,
                        lastName: true,
                        id: true,
                     },
                  },
               },
            },
            substitutionTeacher: {
               select: {
                  firstName: true,
                  lastName: true,
               },
            },
            group: {
               select: {
                  name: true,
               },
            },
         },
      })

      console.log(timetable)

      res.status(200).json(timetable)
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

timetableRouter.get('/group/:groupId', async (req, res) => {
   const { groupId } = req.params
   const user: User = req.body.user

   try {
      // student and teachers can only see their own timetable
      if (user.role == 'STUDENT' || user.role == 'TEACHER') {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // admin can see all timetables

      // get data from prisma for all groups that the user is either a teacher of or a student in
      const timetable = await prisma.timetable.findMany({
         where: {
            groupId: parseInt(groupId),
         },
         include: {
            subjectOnTeacher: {
               include: {
                  subject: {
                     select: {
                        name: true,
                        id: true,
                     },
                  },
                  teacher: {
                     select: {
                        firstName: true,
                        lastName: true,
                        id: true,
                     },
                  },
               },
            },
            substitutionTeacher: {
               select: {
                  firstName: true,
                  lastName: true,
               },
            },
            group: {
               select: {
                  name: true,
               },
            },
         },
      })

      console.log(timetable)

      res.status(200).json(timetable)
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

timetableRouter.post('/', async (req, res) => {
   const user: User = req.body.user
   const { groupId, subjectOnTeacherId, weekNumber, weekDay, lessonNumber } = req.body

   if (!groupId || !subjectOnTeacherId || !weekNumber || !weekDay || !lessonNumber) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
      // only admin can create a timetable
      if (user.role !== 'ADMIN') {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // create a timetable
      const timetable = await prisma.timetable.create({
         data: {
            groupId,
            subjectOnTeacherId,
            weekNumber,
            weekDay,
            lessonNumber,
         },
      })

      res.status(200).json(timetable)
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

timetableRouter.put('/substitute/:recordId/:substitutionTeacherId', async (req, res) => {
   const user: User = req.body.user
   const { recordId, substitutionTeacherId } = req.params

   if (!recordId || !substitutionTeacherId) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
      // only admin can substitute a teacher
      if (user.role !== 'ADMIN') {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // substitute a teacher
      const timetable = await prisma.timetable.update({
         where: {
            id: parseInt(recordId),
         },
         data: {
            substitutionTeacherId: parseInt(substitutionTeacherId),
         },
      })

      res.status(200).json(timetable)
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

timetableRouter.put('/cancel/:recordId', async (req, res) => {
   const user: User = req.body.user
   const { recordId } = req.params

   if (!recordId) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
      // only admin can cancel a timetable record
      if (user.role !== 'ADMIN') {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // cancel a timetable record
      const timetable = await prisma.timetable.update({
         where: {
            id: parseInt(recordId),
         },
         data: {
            substitutionTeacherId: null,
            isCanceled: true,
         },
      })

      res.status(200).json(timetable)
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

timetableRouter.put('/restore/:recordId', async (req, res) => {
   const user: User = req.body.user
   const { recordId } = req.params

   if (!recordId) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
      // only admin can restore a timetable record
      if (user.role !== 'ADMIN') {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // restore a timetable record
      const timetable = await prisma.timetable.update({
         where: {
            id: parseInt(recordId),
         },
         data: {
            isCanceled: false,
            substitutionTeacherId: null,
         },
      })

      res.status(200).json(timetable)
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

timetableRouter.put('/:recordId', async (req, res) => {
   const user: User = req.body.user
   const { recordId } = req.params
   const { groupId, subjectOnTeacherId, weekNumber, weekDay, lessonNumber } = req.body

   if (!groupId || !subjectOnTeacherId || !weekNumber || !weekDay || !lessonNumber) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
      // only admin can update a timetable record
      if (user.role !== 'ADMIN') {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // update a timetable record
      const timetable = await prisma.timetable.update({
         where: {
            id: parseInt(recordId),
         },
         data: {
            groupId,
            subjectOnTeacherId,
            weekNumber,
            weekDay,
            lessonNumber,
         },
      })

      res.status(200).json(timetable)
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

timetableRouter.delete('/:recordId', async (req, res) => {
   const user: User = req.body.user
   const { recordId } = req.params

   if (!recordId) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
      // only admin can delete a timetable record
      if (user.role !== 'ADMIN') {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // delete a timetable record
      await prisma.timetable.delete({
         where: {
            id: parseInt(recordId),
         },
      })

      res.status(204).json({ message: 'Timetable record deleted' })
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

export default timetableRouter
