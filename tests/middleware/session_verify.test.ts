import { NextFunction, Request, Response } from 'express'
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient, Session, User, Roles as ActualRoles } from '@prisma/client'
type ActualPrismaClient = PrismaClient

jest.mock('@prisma/client', () => {
   const mockSingletonInstance = mockDeep<ActualPrismaClient>()
   return {
      __esModule: true,
      PrismaClient: jest.fn(() => mockSingletonInstance),
      Roles: {
         ADMIN: 'ADMIN',
         TEACHER: 'TEACHER',
         STUDENT: 'STUDENT',
      },
   }
})

jest.mock('../../src/config/globals', () => ({
   SESSION_EXPIRY_TIME: 3600000,
}))

import { sessionVerify } from '../../src/middleware/session_verify'
import { SESSION_EXPIRY_TIME } from '../../src/config/globals'

describe('sessionVerify Middleware', () => {
   let mockRequest: DeepMockProxy<Request>
   let mockResponse: DeepMockProxy<Response>
   let mockNextFunction: NextFunction
   let mockPrisma: DeepMockProxy<ActualPrismaClient>
   let dateSpy: jest.SpyInstance
   const OriginalDate = global.Date

   beforeEach(() => {
      mockPrisma = new PrismaClient() as DeepMockProxy<ActualPrismaClient>
      mockReset(mockPrisma)

      mockRequest = mockDeep<Request>()
      mockResponse = mockDeep<Response>()
      mockResponse.status.mockReturnValue(mockResponse)
      mockNextFunction = jest.fn()
      jest.spyOn(console, 'log').mockImplementation(() => {})
   })

   afterEach(() => {
      jest.clearAllMocks()
      if (dateSpy) {
         dateSpy.mockRestore()
      }
      global.Date = OriginalDate
   })

   it('should return 401 if no cookies are present', async () => {
      ;(mockRequest as any).cookies = undefined
      await sessionVerify(mockRequest as Request, mockResponse as Response, mockNextFunction)
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' })
      expect(mockNextFunction).not.toHaveBeenCalled()
   })

   it('should return 401 if session_token is not in cookies', async () => {
      mockRequest.cookies = {}
      await sessionVerify(mockRequest as Request, mockResponse as Response, mockNextFunction)
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' })
      expect(mockNextFunction).not.toHaveBeenCalled()
   })

   it('should return 401 if session_token is invalid (session not found)', async () => {
      mockRequest.cookies = { session_token: 'invalid_token' }
      ;(mockPrisma.session.findFirst as jest.Mock).mockResolvedValue(null)

      await sessionVerify(mockRequest as Request, mockResponse as Response, mockNextFunction)

      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
         where: { token: 'invalid_token' },
      })
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid session' })
      expect(mockNextFunction).not.toHaveBeenCalled()
   })

   it('should return 401 and delete session if session is expired', async () => {
      const now = new Date()
      const expiredSession: Session = {
         id: 1,
         userId: 101,
         token: 'expired_token',
         createdAt: new Date(now.getTime() - 20000),
         updatedAt: new Date(now.getTime() - 15000),
         expiredAt: new Date(now.getTime() - 10000),
      }
      mockRequest.cookies = { session_token: 'expired_token' }
      ;(mockPrisma.session.findFirst as jest.Mock).mockResolvedValue(expiredSession)
      ;(mockPrisma.session.delete as jest.Mock).mockResolvedValue(expiredSession)

      await sessionVerify(mockRequest as Request, mockResponse as Response, mockNextFunction)

      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
         where: { token: 'expired_token' },
      })
      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
         where: { id: expiredSession.id },
      })
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Session expired' })
      expect(mockNextFunction).not.toHaveBeenCalled()
   })

   it('should update session, attach user to req.body, and call next() for a valid session', async () => {
      const testStartTime = new Date()
      const validSession: Session = {
         id: 2,
         userId: 102,
         token: 'valid_token',
         createdAt: new Date(testStartTime.getTime() - 50000),
         updatedAt: new Date(testStartTime.getTime() - 50000),
         expiredAt: new Date(testStartTime.getTime() + SESSION_EXPIRY_TIME / 2),
      }

      const userBirthDate = new Date('1990-05-15T00:00:00.000Z')
      const userCreatedAt = new Date(testStartTime.getTime() - 100000)
      const userUpdatedAt = new Date(testStartTime.getTime() - 10000)

      const user: User = {
         id: 102,
         firstName: 'Test',
         lastName: 'User',
         email: 'test.user@example.com',
         login: 'testuser102',
         password: 'securehashedpassword123',
         isEmailConfirmed: true,
         phoneNumber: '123-456-7890',
         birthDate: userBirthDate,
         addressId: 1,
         role: ActualRoles.STUDENT,
         createdAt: userCreatedAt,
         updatedAt: userUpdatedAt,
      }

      mockRequest.cookies = { session_token: 'valid_token' }
      mockRequest.body = {}
      ;(mockPrisma.session.findFirst as jest.Mock).mockResolvedValue(validSession)
      ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(user)
      ;(mockPrisma.session.update as jest.Mock).mockResolvedValue({
         ...validSession,
         expiredAt: new Date(testStartTime.getTime() + SESSION_EXPIRY_TIME),
         updatedAt: new Date(testStartTime.getTime()),
      })

      const fixedCurrentDateForSUT = new Date(testStartTime.getTime())
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
         if (arg) {
            return new OriginalDate(arg)
         }
         return fixedCurrentDateForSUT
      })

      await sessionVerify(mockRequest as Request, mockResponse as Response, mockNextFunction)

      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
         where: { token: 'valid_token' },
      })

      const expectedNewExpiryTimestamp = fixedCurrentDateForSUT.getTime() + SESSION_EXPIRY_TIME

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
         where: { id: validSession.id },
         data: {
            expiredAt: new OriginalDate(expectedNewExpiryTimestamp),
         },
      })

      const updateCallArgs = (mockPrisma.session.update as jest.Mock).mock.calls[0][0]
      expect(updateCallArgs.data.expiredAt.getTime()).toBe(expectedNewExpiryTimestamp)

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
         where: { id: validSession.userId },
      })
      expect(mockRequest.body.user).toEqual(user)
      expect(mockNextFunction).toHaveBeenCalledTimes(1)
      expect(mockResponse.status).not.toHaveBeenCalled()
   })
})
