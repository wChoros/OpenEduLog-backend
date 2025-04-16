import request from 'supertest'
import app from '../src/app.tests'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mock middleware
jest.mock('../src/middleware/authorize', () => ({
   authorize: () => ( next: () => never) => next(),
}))

describe('Grades Routes', () => {
   let studentId: number
   let subjectOnTeacherId: number
   let gradeId: number

   beforeAll(async () => {
      const address = await prisma.address.create({
         data: {
            street: 'Common St',
            house: '1A',
            city: 'Cityplace',
            zip: '00000',
            country: 'Nowhere'
         }
      })

      const student = await prisma.user.create({
         data: {
            firstName: 'Stu',
            lastName: 'Dent',
            role: 'STUDENT',
            email: `testuser_${Date.now()}@example.com`,
            login: `testuser_${Date.now()}@example.com`,
            password: 'password',
            birthDate: new Date('2005-05-05'),
            addressId: address.id
         }
      })

      const teacher = await prisma.user.create({
         data: {
            firstName: 'Teach',
            lastName: 'Er',
            role: 'TEACHER',
            email: `testusert_${Date.now()}@example.com`,
            login: `testusert_${Date.now()}@example.com`,
            password: 'password',
            birthDate: new Date('1980-01-01'),
            addressId: address.id
         }
      })

      const subject = await prisma.subject.create({ data: { name: 'Biology' } })
      const relation = await prisma.subjectsOnTeachers.create({ data: { teacherId: teacher.id, subjectId: subject.id } })

      studentId = student.id
      subjectOnTeacherId = relation.id
   })

   it('POST /grades/:studentId/:teacherOnSubjectId/:value - create grade', async () => {
      const res = await request(app)
         .post(`/grades/${studentId}/${subjectOnTeacherId}/5`)
         .send({ weight: 2, description: 'Midterm' })

      expect(res.statusCode).toBe(200)
      expect(res.body.message).toBe('Grade added')

      const grade = await prisma.grade.findFirst({ where: { studentId } })
      if (grade) gradeId = grade.id
   })

   it('GET /grades/:studentId - fetch grades for student', async () => {
      const res = await request(app).get(`/grades/${studentId}`)

      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body[0]).toHaveProperty('subjectName')
   })

   it('GET /grades/details/:gradeId - fetch grade details', async () => {
      const res = await request(app).get(`/grades/details/${gradeId}`)

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('value')
      expect(res.body).toHaveProperty('teacherFirstName')
   })

   it('PUT /grades/:gradeId/:newValue - update grade', async () => {
      const res = await request(app).put(`/grades/${gradeId}/4`)

      expect(res.statusCode).toBe(200)
      expect(res.body.message).toBe('Grade updated')
   })

   it('DELETE /grades/:gradeId - delete grade', async () => {
      const res = await request(app).delete(`/grades/${gradeId}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.message).toBe('Grade deleted')
   })

   afterAll(async () => {
      await prisma.grade.deleteMany()
      await prisma.subjectsOnTeachers.deleteMany()
      await prisma.subject.deleteMany()
      await prisma.user.deleteMany()
      await prisma.address.deleteMany()
      await prisma.$disconnect()
   })
})
