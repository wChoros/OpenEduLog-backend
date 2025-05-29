import request from 'supertest'
import app from '../src/app.tests'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// You can mock or seed this data in a beforeAll() hook
const studentId = 2
const teacherId = 3//const subjectId = 1
const groupId = 1

// Mock authentication middleware if needed
jest.mock('../src/middleware/authorize', () => ({
   authorize: () => (req: never, res: never, next: () => never) => next(),
}))

describe('Subjects Routes', () => {
   it('GET /subjects/student/:studentId - fetch subjects for student', async () => {
      const res = await request(app).get(`/subjects/student/${studentId}`)
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
   })

   it('GET /subjects/teacher/:teacherId - fetch subjects for teacher', async () => {
      const res = await request(app).get(`/subjects/teacher/${teacherId}`)
      expect(res.statusCode).toBe(201)
      expect(Array.isArray(res.body)).toBe(true)
   })

   it('GET /subjects/group/:groupId - fetch subjects by group', async () => {
      const res = await request(app).get(`/subjects/group/${groupId}`)
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
   })

   it('POST /subjects - create a subject', async () => {
      const res = await request(app).post('/subjects').send({
         subjectName: 'Mathematics',
         user: { id: teacherId },
      })
      expect(res.statusCode).toBe(201)
      expect(res.body).toHaveProperty('id')
   })

   it('DELETE /subjects/:subjectId - delete a subject', async () => {
      const created = await prisma.subject.create({ data: { name: 'TempSubject' } })

      const res = await request(app)
         .delete(`/subjects/${created.id}`)
         .send({ user: { id: teacherId } })

      expect(res.statusCode).toBe(204)
   })

   it('PUT /subjects/:subjectId - update a subject', async () => {
      const created = await prisma.subject.create({ data: { name: 'ToUpdate' } })

      const res = await request(app)
         .put(`/subjects/${created.id}`)
         .send({ subjectName: 'Updated Name', user: { id: teacherId } })

      expect(res.statusCode).toBe(200)
      expect(res.body.name).toBe('Updated Name')
   })

   it('POST /subjects/teacher - assign teacher to subject', async () => {
      const subject = await prisma.subject.create({ data: { name: 'WithTeacher' } })

      const res = await request(app)
         .post('/subjects/teacher')
         .send({ teacherId, subjectId: subject.id, user: { id: teacherId } })

      expect([201, 409]).toContain(res.statusCode) // Either created or conflict if already exists
   })

   it('DELETE /subjects/teacher - remove teacher from subject', async () => {
      const subject = await prisma.subject.create({ data: { name: 'ToRemove' } })
      await prisma.subjectsOnTeachers.create({
         data: { teacherId, subjectId: subject.id },
      })

      const res = await request(app)
         .delete('/subjects/teacher')
         .send({ teacherId, subjectId: subject.id, user: { id: teacherId } })

      expect(res.statusCode).toBe(204)
   })

   afterAll(async () => {
      await prisma.$disconnect()
   })
})
