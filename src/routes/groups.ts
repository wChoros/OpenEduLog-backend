import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const groupsRouter = express.Router()
const prisma = new PrismaClient()

// get groups for student
groupsRouter.get('/student/:studentId', async (req: Request, res: Response) => {
   const { studentId } = req.params
   const user = req.body.user

   // student can only see their own groups
   if (user.role == 'STUDENT') {
      if (user.id !== parseInt(studentId)) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }
   }

   // teacher can only see groups they teach
   if (user.role == 'TEACHER') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // admin can see all groups

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
})

// get groups for teacher
groupsRouter.get('/teacher/:teacherId', async (req: Request, res: Response) => {
   const { teacherId } = req.params
   const user = req.body.user

   // student can only see their own groups
   if (user.role == 'STUDENT') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // teacher can only see groups they teach
   if (user.role == 'TEACHER') {
      if (user.id !== parseInt(teacherId)) {
         res.status(403).json({ message: 'Forbidden' })
         return
      }
   }

   // admin can see all groups

   // get groups for teacher

   const groups = await prisma.group.findMany({
      where: {
         GroupsOnTeachersOnSubjects: {
            some: {
               teacherId: parseInt(teacherId),
            },
         },
      },
   })

   res.status(200).json(groups)
})

groupsRouter.post('/create', async (req: Request, res: Response) => {
   const user = req.body.user
   const { name } = req.body

   // only admin can create groups
   if (user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   const group = await prisma.group.create({
      data: {
         name,
      },
   })

   res.status(201).json(group)
})

groupsRouter.delete('/delete', async (req: Request, res: Response) => {
   const user = req.body.user
   const { groupId } = req.body

   // only admin can delete groups
   if (user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

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
})

groupsRouter.post('/add-student', async (req: Request, res: Response) => {
   const user = req.body.user
   const { studentId, groupId } = req.body

   // only admin can add students to groups
   if (user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   const studentOnGroup = await prisma.studentsOnGroups.create({
      data: {
         studentId,
         groupId,
      },
   })

   res.status(201).json(studentOnGroup)
})

groupsRouter.post('/add-teacher', async (req: Request, res: Response) => {
   const user = req.body.user
   const { teacherId, groupId, subjectId } = req.body

   // only admin can add teachers to groups
   if (user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   // check if teacher is teaching the subject
   const teacherOnSubject = await prisma.groupsOnSubjectsOnTeachers.findFirst({
      where: {
         teacherId,
         groupId,
         subjectId,
      },
   })
   if (!teacherOnSubject) {
      res.status(403).json({ message: 'Teacher is not teaching this subject' })
      return
   }

   const teacherOnGroup = await prisma.groupsOnSubjectsOnTeachers.create({
      data: {
         teacherId,
         groupId,
         subjectId,
      },
   })

   res.status(201).json(teacherOnGroup)
})

groupsRouter.delete('/remove-student', async (req: Request, res: Response) => {
   const user = req.body.user
   const { studentId, groupId } = req.body

   // only admin can remove students from groups
   if (user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   await prisma.studentsOnGroups.deleteMany({
      where: {
         studentId,
         groupId,
      },
   })

   res.status(204).json({ message: 'Student removed from group' })
})

groupsRouter.delete('/remove-teacher', async (req: Request, res: Response) => {
   const user = req.body.user
   const { teacherId, groupId, subjectId } = req.body

   // only admin can remove teachers from groups
   if (user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   await prisma.groupsOnSubjectsOnTeachers.deleteMany({
      where: {
         teacherId,
         groupId,
         subjectId,
      },
   })

   res.status(204).json({ message: 'Teacher removed from group' })
})

export default groupsRouter
