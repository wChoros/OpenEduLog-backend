import express from 'express'
import { PrismaClient, User } from '@prisma/client'
import { authorize } from '../middleware/authorize'

const timetableRouter = express.Router()
const prisma = new PrismaClient()

timetableRouter.get(
   '/user/:userId/:startDate/:endDate',
   authorize('read', 'Timetable'),
   async (req, res) => {
      const { startDate, endDate, userId } = req.params
      try {
         // Parse ISO string dates to JavaScript Date objects
         const start = new Date(startDate)
         const end = new Date(endDate)

         if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({ message: 'Invalid date format' })
            return
         }

         // Get data from prisma for all groups that the user is either a teacher of or a student in
         const timetable = await prisma.timetable.findMany({
            where: {
               date: {
                  gte: start,
                  lte: end,
               },
               OR: [
                  { subjectOnTeacher: { teacherId: parseInt(userId, 10) } },
                  { group: { StudentsOnGroups: { some: { studentId: parseInt(userId, 10) } } } },
               ],
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
   }
)

timetableRouter.get('/group/:groupId', authorize('read', 'Timetable'), async (req, res) => {
   const { groupId } = req.params
   try {
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

timetableRouter.post('/', authorize('create', 'Timetable'), async (req, res) => {
   const user: User = req.body.user
   const { groupId, subjectOnTeacherId, date, lessonNumber } = req.body

   if (!groupId || !subjectOnTeacherId || !date || !lessonNumber) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
      // only admin can create a timetable
      if (user.role !== 'ADMIN') {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // Check if the group already has a lesson on this date and lesson number
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const existingLesson = await prisma.timetable.findFirst({
         where: {
            groupId,
            date: {
               gte: startOfDay,
               lte: endOfDay,
            },
            lessonNumber,
         },
      })

      if (existingLesson) {
         res.status(400).json({
            message:
               'A lesson already exists for this group on the specified date and lesson number',
         })
         return
      }

      // create a timetable
      const timetable = await prisma.timetable.create({
         data: {
            groupId,
            subjectOnTeacherId,
            date,
            lessonNumber,
         },
      })

      res.status(200).json(timetable)
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

timetableRouter.put(
   '/substitute/:recordId/:substitutionTeacherId',
   authorize('update', 'Timetable'),
   async (req, res) => {
      const { recordId, substitutionTeacherId } = req.params

      if (!recordId || !substitutionTeacherId) {
         res.status(400).json({ message: 'Missing fields' })
         return
      }

      try {
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
   }
)

timetableRouter.put('/cancel/:recordId', authorize('update', 'Timetable'), async (req, res) => {
   const { recordId } = req.params

   if (!recordId) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
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

timetableRouter.put('/restore/:recordId', authorize('update', 'Timetable'), async (req, res) => {
   const { recordId } = req.params

   if (!recordId) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
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

timetableRouter.put('/:recordId', authorize('update', 'Timetable'), async (req, res) => {
   const { recordId } = req.params
   const { groupId, subjectOnTeacherId, date, lessonNumber } = req.body

   if (!groupId || !subjectOnTeacherId || !date || !lessonNumber) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
      // update a timetable record
      const timetable = await prisma.timetable.update({
         where: {
            id: parseInt(recordId),
         },
         data: {
            groupId,
            subjectOnTeacherId,
            date,
            lessonNumber,
         },
      })

      res.status(200).json(timetable)
      return
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

timetableRouter.delete('/:recordId', authorize('delete', 'Timetable'), async (req, res) => {
   const { recordId } = req.params

   if (!recordId) {
      res.status(400).json({ message: 'Missing fields' })
      return
   }

   try {
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
