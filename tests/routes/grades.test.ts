import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client' // Actual import for type, but will be mocked
import { authorize as authorizeMiddleware } from '../../src/middleware/authorize' // Actual import for type

// Mock dependencies
// Important: Mock PrismaClient constructor to return our controlled instance
const mockPrismaClientInstance = {
   grade: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
   },
}

jest.mock('@prisma/client', () => ({
   PrismaClient: jest.fn().mockImplementation(() => mockPrismaClientInstance),
}))

// Mock authorize middleware
// It's a higher-order function, so it needs to return the actual middleware function
jest.mock('../../src/middleware/authorize', () => ({
   authorize: jest.fn(),
}))

// Import the router AFTER mocks are set up.
// Use jest.resetModules() in beforeEach to ensure fresh mocks for each test.
let gradesRouter: any // To be loaded dynamically

// Define a minimal type for an Express route layer
interface ExpressLayer {
   route?: {
      path: string
      methods: { [key: string]: boolean }
      stack: Array<{ handle: Function }>
   }
   handle_request?: Function // For middleware not directly on a route
   handle_error?: Function // For error handling middleware
   // Add other properties if needed for your specific Express version/setup
}

// Helper to extract route handlers from the router stack
const getRouteHandlers = (router: any, method: string, path: string): Function[] => {
   const layer = router.stack.find(
      (l: ExpressLayer) =>
         l.route &&
         l.route.path === path &&
         l.route.methods &&
         l.route.methods[method.toLowerCase()]
   )
   if (!layer || !layer.route) {
      // Corrected the map function's parameter 'l_map' to avoid conflict and add type
      const availableRoutes = router.stack
         .map(
            (l_map: ExpressLayer) =>
               l_map.route && {
                  path: l_map.route.path,
                  methods: Object.keys(l_map.route.methods).filter((m) => l_map.route!.methods[m]),
               }
         )
         .filter(Boolean) // Filter out undefined entries if a layer has no route
      throw new Error(
         `Handlers not found for ${method.toUpperCase()} ${path}. Available routes: ${JSON.stringify(availableRoutes)}`
      )
   }
   return layer.route.stack.map((s: { handle: Function }) => s.handle)
}

describe('Grades Router', () => {
   let mockReq: Partial<Request>
   let mockRes: Partial<Response>
   let nextFunction: NextFunction
   let mockedAuthorizeMiddleware: jest.Mock

   beforeEach(async () => {
      jest.resetModules() // Reset modules to allow re-importing with fresh mocks

      // Re-establish mocks for each test to ensure isolation
      jest.mock('@prisma/client', () => ({
         PrismaClient: jest.fn().mockImplementation(() => mockPrismaClientInstance),
      }))

      mockedAuthorizeMiddleware = jest.fn((req, res, next) => next()) as jest.Mock
      jest.mock('../../src/middleware/authorize', () => ({
         authorize: jest.fn(() => mockedAuthorizeMiddleware),
      }))

      // Dynamically import the router to use the fresh mocks
      const routerModule = await import('../../src/routes/grades')
      gradesRouter = routerModule.default

      // Clear all individual mock function calls (like prisma.grade.findMany)
      Object.values(mockPrismaClientInstance.grade).forEach((mockFn) => mockFn.mockClear())
      ;(require('../../src/middleware/authorize').authorize as jest.Mock).mockClear()

      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn(),
         send: jest.fn(),
      } as unknown as Partial<Response>
      nextFunction = jest.fn()
   })

   describe('GET /grades/:studentId', () => {
      it('should fetch and return grades for a student', async () => {
         mockReq = { params: { studentId: '1' } }
         const mockGradesData = [
            { id: 1, value: 5, weight: 2, subjectOnTeacher: { subject: { name: 'Math' } } },
            { id: 2, value: 4, weight: 1, subjectOnTeacher: { subject: { name: 'Science' } } },
         ]
         mockPrismaClientInstance.grade.findMany.mockResolvedValue(mockGradesData)

         const handlers = getRouteHandlers(gradesRouter, 'get', '/:studentId')
         const authorizeHandler = handlers[0]
         const mainHandler = handlers[1]

         await authorizeHandler(mockReq as Request, mockRes as Response, async (err?: any) => {
            if (err) return nextFunction(err)
            await mainHandler(mockReq as Request, mockRes as Response, nextFunction)
         })

         expect(mockedAuthorizeMiddleware).toHaveBeenCalled()
         expect(mockPrismaClientInstance.grade.findMany).toHaveBeenCalledWith({
            where: { studentId: 1 },
            include: { subjectOnTeacher: { include: { subject: true } } },
         })
         expect(mockRes.json).toHaveBeenCalledWith([
            { id: 1, value: 5, weight: 2, subjectName: 'Math' },
            { id: 2, value: 4, weight: 1, subjectName: 'Science' },
         ])
      })
   })

   describe('GET /grades/details/:gradeId', () => {
      it('should fetch and return grade details', async () => {
         mockReq = { params: { gradeId: '1' } }
         const mockGradeDetailData = {
            id: 1,
            value: 5,
            description: 'Excellent',
            weight: 2,
            subjectOnTeacher: {
               subject: { name: 'History', id: 101 },
               teacher: { firstName: 'Jane', lastName: 'Doe', id: 201 },
               subjectId: 101,
               teacherId: 201,
            },
            createdAt: new Date('2023-01-01T10:00:00.000Z'),
            updatedAt: new Date('2023-01-01T11:00:00.000Z'),
         }
         mockPrismaClientInstance.grade.findFirst.mockResolvedValue(mockGradeDetailData)

         const handlers = getRouteHandlers(gradesRouter, 'get', '/details/:gradeId')
         await handlers[0](mockReq as Request, mockRes as Response, async (err?: any) => {
            if (err) return nextFunction(err)
            await handlers[1](mockReq as Request, mockRes as Response, nextFunction)
         })

         expect(mockedAuthorizeMiddleware).toHaveBeenCalled()
         expect(mockPrismaClientInstance.grade.findFirst).toHaveBeenCalledWith({
            where: { id: 1 },
            include: { subjectOnTeacher: { include: { teacher: true, subject: true } } },
         })
         expect(mockRes.json).toHaveBeenCalledWith({
            id: 1,
            value: 5,
            description: 'Excellent',
            weight: 2,
            subjectName: 'History',
            subjectId: 101,
            teacherFirstName: 'Jane',
            teacherLastName: 'Doe',
            teacherId: 201,
            addedAt: mockGradeDetailData.createdAt,
            updatedAt: mockGradeDetailData.updatedAt,
         })
      })

      it('should return 404 if grade not found', async () => {
         mockReq = { params: { gradeId: '99' } }
         mockPrismaClientInstance.grade.findFirst.mockResolvedValue(null)

         const handlers = getRouteHandlers(gradesRouter, 'get', '/details/:gradeId')
         await handlers[0](mockReq as Request, mockRes as Response, async (err?: any) => {
            if (err) return nextFunction(err)
            await handlers[1](mockReq as Request, mockRes as Response, nextFunction)
         })

         expect(mockRes.status).toHaveBeenCalledWith(404)
         expect(mockRes.json).toHaveBeenCalledWith({ message: 'Grade not found' })
      })
   })

   describe('POST /grades/:studentId/:teacherOnSubjectId/:value', () => {
      it('should add a new grade', async () => {
         mockReq = {
            params: {
               studentId: '1',
               teacherOnSubjectId: '2',
               value: '5',
               description: 'Good work',
               weight: '2', // These are from params as per router code
            },
         }
         mockPrismaClientInstance.grade.create.mockResolvedValue({ id: 1 })

         const handlers = getRouteHandlers(
            gradesRouter,
            'post',
            '/:studentId/:teacherOnSubjectId/:value'
         )
         // This route has no authorize middleware in its definition in the provided code
         await handlers[0](mockReq as Request, mockRes as Response, nextFunction)

         expect(mockPrismaClientInstance.grade.create).toHaveBeenCalledWith({
            data: {
               studentId: 1,
               subjectOnTeacherId: 2,
               value: 5,
               description: 'Good work',
               weight: 2,
            },
         })
         expect(mockRes.json).toHaveBeenCalledWith({ message: 'Grade added' })
      })
   })

   describe('DELETE /grades/:gradeId', () => {
      it('should delete a grade', async () => {
         mockReq = { params: { gradeId: '1' } }
         mockPrismaClientInstance.grade.findFirst.mockResolvedValue({ id: 1 })
         mockPrismaClientInstance.grade.delete.mockResolvedValue({ id: 1 })

         const handlers = getRouteHandlers(gradesRouter, 'delete', '/:gradeId')
         await handlers[0](mockReq as Request, mockRes as Response, async (err?: any) => {
            if (err) return nextFunction(err)
            await handlers[1](mockReq as Request, mockRes as Response, nextFunction)
         })

         expect(mockedAuthorizeMiddleware).toHaveBeenCalled()
         expect(mockPrismaClientInstance.grade.findFirst).toHaveBeenCalledWith({ where: { id: 1 } })
         expect(mockPrismaClientInstance.grade.delete).toHaveBeenCalledWith({ where: { id: 1 } })
         // The original code doesn't send a response. Test reflects this.
         expect(mockRes.json).not.toHaveBeenCalled()
         expect(mockRes.status).not.toHaveBeenCalled()
      })

      it('should return 404 if grade to delete not found', async () => {
         mockReq = { params: { gradeId: '99' } }
         mockPrismaClientInstance.grade.findFirst.mockResolvedValue(null)

         const handlers = getRouteHandlers(gradesRouter, 'delete', '/:gradeId')
         await handlers[0](mockReq as Request, mockRes as Response, async (err?: any) => {
            if (err) return nextFunction(err)
            await handlers[1](mockReq as Request, mockRes as Response, nextFunction)
         })

         expect(mockRes.status).toHaveBeenCalledWith(404)
         expect(mockRes.json).toHaveBeenCalledWith({ message: 'Grade not found' })
      })
   })

   describe('PUT /grades/:gradeId/:newValue', () => {
      it('should update a grade', async () => {
         mockReq = { params: { gradeId: '1', newValue: '4' } }
         mockPrismaClientInstance.grade.findFirst.mockResolvedValue({ id: 1, value: 5 })
         mockPrismaClientInstance.grade.update.mockResolvedValue({ id: 1, value: 4 })

         const handlers = getRouteHandlers(gradesRouter, 'put', '/:gradeId/:newValue')
         await handlers[0](mockReq as Request, mockRes as Response, async (err?: any) => {
            if (err) return nextFunction(err)
            await handlers[1](mockReq as Request, mockRes as Response, nextFunction)
         })

         expect(mockedAuthorizeMiddleware).toHaveBeenCalled()
         expect(mockPrismaClientInstance.grade.findFirst).toHaveBeenCalledWith({ where: { id: 1 } })
         expect(mockPrismaClientInstance.grade.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { value: 4 },
         })
         expect(mockRes.json).toHaveBeenCalledWith({ message: 'Grade updated' })
      })

      it('should return 404 if grade to update not found', async () => {
         mockReq = { params: { gradeId: '99', newValue: '4' } }
         mockPrismaClientInstance.grade.findFirst.mockResolvedValue(null)

         const handlers = getRouteHandlers(gradesRouter, 'put', '/:gradeId/:newValue')
         await handlers[0](mockReq as Request, mockRes as Response, async (err?: any) => {
            if (err) return nextFunction(err)
            await handlers[1](mockReq as Request, mockRes as Response, nextFunction)
         })

         expect(mockRes.status).toHaveBeenCalledWith(404)
         expect(mockRes.json).toHaveBeenCalledWith({ message: 'Grade not found' })
      })
   })
})
