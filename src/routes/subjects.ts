import express, { Request, Response } from 'express'
import { PrismaClient, Roles, User } from '@prisma/client'
import { authorize } from '../middleware/authorize'

const subjectsRouter = express.Router()
const prisma = new PrismaClient()

// get subjects for student
subjectsRouter.get(
   '/student/:studentId',
   authorize('read', 'Subject'),
   async (req: Request, res: Response) => {
      const user: User = req.body.user
      const { studentId } = req.params

      // student can only see their own subjects
      if (user.role == Roles.STUDENT) {
         if (user.id !== parseInt(studentId)) {
            res.status(403).json({ message: 'Forbidden' })
            return
         }
      }

      // teacher can only see subjects they teach
      if (user.role == Roles.TEACHER) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // admin can see all subjects

   // get subjects for student
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
   authorize('read', 'Subject'),
   async (req: Request, res: Response) => {
      const user: User = req.body.user
      const { teacherId } = req.params

      // student can only see their own subjects
      if (user.role == Roles.STUDENT) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // teacher can only see subjects they teach
      if (user.role == Roles.TEACHER) {
         if (user.id !== parseInt(teacherId)) {
            res.status(403).json({ message: 'Forbidden' })
            return
         }
      }

      // admin can see all subjects

   // get subjects for teacher
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

// get subjects for a group
subjectsRouter.get(
   '/group/:groupId',
   authorize('read', 'Subject'),
   async (req: Request, res: Response) => {
      const user: User = req.body.user
      const { groupId } = req.params

      // student can only see subjects for their group
      if (user.role == Roles.STUDENT) {
         const group = await prisma.group.findFirst({
            where: {
               StudentsOnGroups: {
                  some: {
                     studentId: user.id,
                     groupId: parseInt(groupId),
                  },
               },
            },
         })
         if (!group) {
            res.status(403).json({ message: 'Forbidden' })
            return
         }
      }

      // teacher can only see subjects they teach
      if (user.role == Roles.TEACHER) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

      // admin can see all subjects

   // get subjects for group
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

subjectsRouter.post('/', async (req: Request, res: Response) => {
   const user: User = req.body.user
   const { subjectName } = req.body

   // only admin can create a subject
   if (user.role !== Roles.ADMIN) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // create a subject
   const subject = await prisma.subject.create({
      data: {
         name: subjectName,
      },
   })

   res.status(201).json(subject)
   return
})

subjectsRouter.delete(
   '/:subjectId',
   authorize('delete', 'Subject'),
   async (req: Request, res: Response) => {
      const user: User = req.body.user
      const { subjectId } = req.params

      // only admin can delete a subject
      if (user.role !== Roles.ADMIN) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

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

subjectsRouter.put('/:subjectId', async (req: Request, res: Response) => {
   const user: User = req.body.user
   const { subjectId } = req.params
   const { subjectName } = req.body

   // only admin can update a subject
   if (user.role !== Roles.ADMIN) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

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
})

// add a teacher to a subject
subjectsRouter.post(
   '/teacher',
   authorize('addTo', 'Subject'),
   async (req: Request, res: Response) => {
      const user: User = req.body.user
      const { teacherId, subjectId } = req.body

      // only admin can add a teacher to a subject
      if (user.role !== Roles.ADMIN) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

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
   authorize('removeFrom', 'Subject'),
   async (req: Request, res: Response) => {
      const user: User = req.body.user
      const { teacherId, subjectId } = req.body

      // only admin can remove a teacher from a subject
      if (user.role !== Roles.ADMIN) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }

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
