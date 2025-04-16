import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authorize } from '../middleware/authorize'

const timetableRouter = express.Router()
const prisma = new PrismaClient()

timetableRouter.get(
   '/user/:userId/:weekNumber',
   authorize('readMany', 'Timetable', (req) => Number(req.params.userId)),
   async (req, res) => {
      const { weekNumber } = req.params

      try {
         // get data from prisma for all groups that the user is either a teacher of or a student in
         const timetable = await prisma.timetable.findMany({
            where: {
               weekNumber: parseInt(weekNumber, 10),
               group: {
                  StudentsOnGroups: {
                     some: {
                        studentId: parseInt(req.params.userId, 10),
                     },
                  },
               },
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

//new route for teacher timetable
timetableRouter.get(
   '/teacher/:userId/:weekNumber',
   authorize('readMany', 'Timetable', (req) => Number(req.params.userId)),
   async (req, res) => {
      const { weekNumber } = req.params

      try {
         // get data from prisma for all groups that the user is either a teacher of or a student in
         const timetable = await prisma.timetable.findMany({
            where: {
               weekNumber: parseInt(weekNumber, 10),
               subjectOnTeacherId: parseInt(req.params.userId, 10),
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

timetableRouter.post(
   '/',
   authorize('add', 'Timetable', (req) => Number(req.body.user.id)),
   async (req, res) => {
      const { groupId, subjectOnTeacherId, weekNumber, weekDay, lessonNumber } = req.body

      if (!groupId || !subjectOnTeacherId || !weekNumber || !weekDay || !lessonNumber) {
         res.status(400).json({ message: 'Missing fields' })
         return
      }

      try {
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
   }
)

//to authorize
timetableRouter.put(
   '/substitute/:recordId/:substitutionTeacherId',
   authorize('update', 'Timetable', (req) => Number(req.body.user.id)),
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

//to authorize
timetableRouter.put('/cancel/:recordId', async (req, res) => {
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

//to authorize
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

//to authorize
timetableRouter.put('/:recordId', authorize('update', 'Timetable'), async (req, res) => {
   const { recordId } = req.params
   const { groupId, subjectOnTeacherId, weekNumber, weekDay, lessonNumber } = req.body

   if (!groupId || !subjectOnTeacherId || !weekNumber || !weekDay || !lessonNumber) {
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

//to authorize
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
