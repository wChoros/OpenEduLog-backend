import request from 'supertest'
import app from '../src/app.tests' // Your Express app instance
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mock the authorize middleware to always allow
jest.mock('../src/middleware/authorize', () => ({
   authorize: () => ( next: any) => next(),
}))

describe('Timetable Router', () => {
   beforeAll(async () => {
      // Optional: seed test data
   })

   afterAll(async () => {
      await prisma.$disconnect()
   })

   test('GET /timetable/user/:userId/:weekNumber returns timetable entries for student', async () => {
      const userId = 1
      const weekNumber = 12

      const response = await request(app).get(`/timetable/user/${userId}/${weekNumber}`)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
   })

   test('GET /timetable/teacher/:userId/:weekNumber returns timetable entries for teacher', async () => {
      const userId = 2
      const weekNumber = 12

      const response = await request(app).get(`/timetable/teacher/${userId}/${weekNumber}`)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
   })

   test('POST /timetable/ creates a new timetable entry', async () => {
      const response = await request(app).post('/timetable/').send({
         user: { id: 1 },
         groupId: 1,
         subjectOnTeacherId: 1,
         weekNumber: 12,
         weekDay: 'MONDAY',
         lessonNumber: 1,
      })
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('id')
   })

   test('PUT /timetable/substitute/:recordId/:substitutionTeacherId updates substitution teacher', async () => {
      const response = await request(app).put('/timetable/substitute/1/2').send({
         user: { id: 1 },
      })
      expect(response.status).toBe(200)
      expect(response.body.substitutionTeacherId).toBe(2)
   })

   test('PUT /timetable/cancel/:recordId cancels the timetable entry', async () => {
      const response = await request(app).put('/timetable/cancel/1')
      expect(response.status).toBe(200)
      expect(response.body.isCanceled).toBe(true)
   })

   test('PUT /timetable/restore/:recordId restores a cancelled entry', async () => {
      const response = await request(app).put('/timetable/restore/1')
      expect(response.status).toBe(200)
      expect(response.body.isCanceled).toBe(false)
   })

   test('DELETE /timetable/:recordId deletes a timetable entry', async () => {
      const response = await request(app).delete('/timetable/1')
      expect(response.status).toBe(204)
   })
})