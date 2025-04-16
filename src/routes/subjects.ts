import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authorize } from '../middleware/authorize'

const subjectsRouter = express.Router()
const prisma = new PrismaClient()

// get subjects for student
subjectsRouter.get(
   '/student/:studentId',
   authorize('readMany', 'Subject', (req) => Number(req.params.studentId)),
   async (req: Request, res: Response) => {
      const { studentId } = req.params

      const subjects = await prisma.subject.findMany({
         where: {
            SubjectsOnTeachers: {
               some: {
                  GroupsOnSubjectsOnTeachers: {
                     some: {
                        group: {
                           StudentsOnGroups: {
                              some: {
                                 studentId: parseInt(studentId),
                              },
                           },
                        },
                     },
                  },
               },
            },
         },
         include: {
            // Include subjects->teachers->groups
            SubjectsOnTeachers: {
               include: {
                  GroupsOnSubjectsOnTeachers: {
                     include: {
                        group: true,
                     },
                  },
               },
            },
         },
      })

      res.status(200).json(subjects)
      return
   }
)

// get subjects for teacher
subjectsRouter.get(
   'teacher/:teacherId',
   authorize('readMany', 'Subject', (req) => Number(req.params.teacherId)),
   async (req: Request, res: Response) => {
      const { teacherId } = req.params

      const subjects = await prisma.subject.findMany({
         where: {
            SubjectsOnTeachers: {
               some: {
                  teacherId: parseInt(teacherId),
               },
            },
         },
         include: {
            SubjectsOnTeachers: {
               include: {
                  // This is where the join table actually lives
                  GroupsOnSubjectsOnTeachers: {
                     include: {
                        group: true,
                     },
                  },
                  // If you also want teacher info, include it as well:
                  teacher: true,
               },
            },
         },
      })

      res.status(201).json(subjects)
      return
   }
)

//to authorize
subjectsRouter.get(
   '/group/:groupId',
   authorize('read', 'Subject',(req) => Number(req.params.groupId)),
   async (req: Request, res: Response) => {
      const { groupId } = req.params

      const subjects = await prisma.subject.findMany({
         where: {
            SubjectsOnTeachers: {
               some: {
                  GroupsOnSubjectsOnTeachers: {
                     some: {
                        groupId: parseInt(groupId),
                     },
                  },
               },
            },
         },
         include: {
            SubjectsOnTeachers: {
               include: {
                  GroupsOnSubjectsOnTeachers: {
                     include: {
                        group: true, // Include the actual group data
                     },
                  },
               },
            },
         },
      })

      res.status(200).json(subjects)
      return
   }
)

subjectsRouter.post(
   '/',
   authorize('add', 'Subject', (req) => Number(req.body.user.id)),
   async (req: Request, res: Response) => {
      const { subjectName } = req.body

      // create a subject
      const subject = await prisma.subject.create({
         data: {
            name: subjectName,
         },
      })

      res.status(201).json(subject)
      return
   }
)

subjectsRouter.delete(
   '/:subjectId',
   authorize('delete', 'Subject', (req) => Number(req.body.user.id)),
   async (req: Request, res: Response) => {
      const { subjectId } = req.params

      // delete a subject
      await prisma.subject.delete({
         where: {
            id: parseInt(subjectId),
         },
      })

      res.status(204).json({ message: 'Subject deleted' })
      return
   }
)

subjectsRouter.put(
   '/:subjectId',
   authorize('update', 'Subject', (req) => Number(req.body.user.id)),
   async (req: Request, res: Response) => {
      const { subjectId } = req.params
      const { subjectName } = req.body

      // update a subject
      const subject = await prisma.subject.update({
         where: {
            id: parseInt(subjectId),
         },
         data: {
            name: subjectName,
         },
      })

      res.status(200).json(subject)
      return
   }
)

// add a teacher to a subject
subjectsRouter.post(
   '/teacher',
   authorize('addTo', 'Subject', (req) => Number(req.body.user.id)),
   async (req: Request, res: Response) => {
      const { teacherId, subjectId } = req.body

      // add a teacher to a subject
      const existingPair = await prisma.subjectsOnTeachers.findFirst({
         where: {
            teacherId: teacherId,
            subjectId: subjectId,
         },
      })

      if (existingPair) {
         res.status(409).json({ message: 'Teacher is already assigned to this subject' })
         return
      }

      const subjectOnTeacher = await prisma.subjectsOnTeachers.create({
         data: {
            teacherId: teacherId,
            subjectId: subjectId,
         },
      })

      res.status(201).json(subjectOnTeacher)
      return
   }
)

// remove a teacher from a subject
subjectsRouter.delete(
   '/teacher',
   authorize('removeFrom', 'Subject', (req) => Number(req.body.user.id)),
   async (req: Request, res: Response) => {
      const { teacherId, subjectId } = req.body

      // remove a teacher from a subject
      await prisma.subjectsOnTeachers.deleteMany({
         where: {
            teacherId: teacherId,
            subjectId: subjectId,
         },
      })

      res.status(204).json({ message: 'Teacher removed from subject' })
      return
   }
)

export default subjectsRouter
