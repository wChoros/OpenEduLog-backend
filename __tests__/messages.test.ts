import request from 'supertest'
import app from '../src/app.tests'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

jest.mock('../src/middleware/authorize', () => ({
   authorize: () => (req: any, res: any, next: () => any) => next(),
}))

describe('Groups Routes', () => {
   let studentId: number, teacherId: number, subjectId: number, groupId: number
   let subjectOnTeacherId: number

   beforeAll(async () => {
      const address = await prisma.address.create({
         data: {
            street: 'Test Street',
            house: '1A',
            city: 'Test City',
            zip: '12345',
            country: 'Testland',
         },
      })

      const student = await prisma.user.create({
         data: {
            firstName: 'Test',
            lastName: 'Student',
            email: `testuser_${Date.now()}@example.com`,
            login: `testuser_${Date.now()}@example.com`,
            password: 'password',
            birthDate: new Date('2000-01-01'),
            role: 'STUDENT',
            addressId: address.id,
         },
      })

      const teacher = await prisma.user.create({
         data: {
            firstName: 'Test',
            lastName: 'Teacher',
            email: `testusert_${Date.now()}@example.com`,
            login: `testusert_${Date.now()}@example.com`,
            password: 'password',
            birthDate: new Date('1980-01-01'),
            role: 'TEACHER',
            addressId: address.id,
         },
      })

      const subject = await prisma.subject.create({ data: { name: 'Math' } })
      const relation = await prisma.subjectsOnTeachers.create({ data: { teacherId: teacher.id, subjectId: subject.id } })
      const group = await prisma.group.create({ data: { name: 'Group A' } })

      studentId = student.id
      teacherId = teacher.id
      subjectId = subject.id
      groupId = group.id
      subjectOnTeacherId = relation.id
   })

   it('GET /groups/student/:studentId - fetch groups for student', async () => {
      await prisma.studentsOnGroups.create({ data: { studentId, groupId } })
      const res = await request(app).get(`/groups/student/${studentId}`)

      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
   })

   it('GET /groups/teacher/:teacherId - fetch groups for teacher', async () => {
      await prisma.groupsOnSubjectsOnTeachers.create({ data: { subjectOnTeacherId, groupId } })
      const res = await request(app).get(`/groups/teacher/${teacherId}`)

      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
   })

   it('POST /groups/create - create group', async () => {
      const res = await request(app)
         .post('/groups/create')
         .send({ name: 'New Group', user: { id: teacherId } })

      expect(res.statusCode).toBe(201)
      expect(res.body).toHaveProperty('name', 'New Group')
   })

   it('POST /groups/add-student - add student to group', async () => {
      const res = await request(app)
         .post('/groups/add-student')
         .send({ studentId, groupId, user: { id: teacherId } })

      expect(res.statusCode).toBe(201)
      expect(res.body).toHaveProperty('studentId', studentId)
   })

   it('POST /groups/add-teacher - add teacher to group with subject', async () => {
      const res = await request(app)
         .post('/groups/add-teacher')
         .send({ teacherId, groupId, subjectId, user: { id: teacherId } })

      expect(res.statusCode).toBe(201)
      expect(res.body).toHaveProperty('groupId', groupId)
   })

   it('DELETE /groups/remove-student - remove student from group', async () => {
      const res = await request(app)
         .delete('/groups/remove-student')
         .send({ studentId, groupId, user: { id: teacherId } })

      expect(res.statusCode).toBe(204)
   })

   it('DELETE /groups/remove-teacher - remove teacher from group', async () => {
      const res = await request(app)
         .delete('/groups/remove-teacher')
         .send({ teacherId, groupId, subjectId, user: { id: teacherId } })

      expect(res.statusCode).toBe(204)
   })

   it('DELETE /groups/delete - delete group', async () => {
      const group = await prisma.group.create({ data: { name: 'Temp Group' } })
      const res = await request(app)
         .delete('/groups/delete')
         .send({ groupId: group.id, user: { id: teacherId } })

      expect(res.statusCode).toBe(204)
      expect(res.body.message).toBe('Group deleted')
   })

   afterAll(async () => {
      await prisma.groupsOnSubjectsOnTeachers.deleteMany()
      await prisma.studentsOnGroups.deleteMany()
      await prisma.group.deleteMany()
      await prisma.subjectsOnTeachers.deleteMany()
      await prisma.subject.deleteMany()
      await prisma.user.deleteMany()
      await prisma.address.deleteMany()
      await prisma.$disconnect()
   })
})
