// src/routes/auth.test.ts

import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'
import authRouter from '../../src/routes/auth'

// Import actual modules for TypeScript type inference
import bcrypt from 'bcrypt'
import * as crypto from 'crypto' // Import Node.js crypto module explicitly

// --- Mocks ---
jest.mock('@prisma/client', () => {
   const mockPrismaInstance = {
      user: {
         findFirst: jest.fn(),
         create: jest.fn(),
      },
      session: {
         create: jest.fn(),
         findFirst: jest.fn(),
         delete: jest.fn(),
      },
      address: {
         create: jest.fn(),
      },
   }
   return {
      PrismaClient: jest.fn(() => mockPrismaInstance),
   }
})

// Mock the bcrypt module; the import above provides its type
jest.mock('bcrypt')

// Mock the crypto module; the 'import * as crypto' provides its type
jest.mock('crypto', () => ({
   ...jest.requireActual('crypto'), // Retain other crypto functions if any
   randomBytes: jest.fn(), // Ensure randomBytes is a mocked function on the module
}))

jest.mock('../../src/config/globals', () => ({
   SESSION_EXPIRY_TIME: 3600000, // 1 hour in milliseconds
}))

jest.mock('email-validator', () => ({
   validate: jest.fn(),
}))

let mockPasswordValidatorValidate: jest.Mock
jest.mock('password-validator', () => {
   return jest.fn().mockImplementation(() => ({
      is: jest.fn().mockReturnThis(),
      min: jest.fn().mockReturnThis(),
      max: jest.fn().mockReturnThis(),
      has: jest.fn().mockReturnThis(),
      uppercase: jest.fn().mockReturnThis(),
      lowercase: jest.fn().mockReturnThis(),
      digits: jest.fn().mockReturnThis(),
      validate: mockPasswordValidatorValidate,
   }))
})

// --- Test Setup ---
const app = express()
app.use(cookieParser())
app.use(express.json())
app.use('/auth', authRouter)

const prismaMock = new (require('@prisma/client').PrismaClient)()

// Use the imported types for mock variables
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>
const cryptoMock = crypto as jest.Mocked<typeof crypto> // cryptoMock is now correctly typed as the mocked Node.js crypto module

const EmailValidatorMock = require('email-validator') as jest.Mocked<
   typeof import('email-validator')
>

describe('Auth Router - src/routes/auth.ts', () => {
   beforeEach(() => {
      jest.clearAllMocks()
      ;(prismaMock.user.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaMock.user.create as jest.Mock).mockResolvedValue({ id: 1, role: 'STUDENT' })
      ;(prismaMock.address.create as jest.Mock).mockResolvedValue({ id: 1 })
      ;(prismaMock.session.create as jest.Mock).mockResolvedValue({
         id: 1,
         token: 'mockSessionToken',
      })
      ;(prismaMock.session.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaMock.session.delete as jest.Mock).mockResolvedValue({})
      ;(bcryptMock.compare as jest.Mock).mockResolvedValue(true)
      ;(bcryptMock.hash as jest.Mock).mockResolvedValue('mockHashedPassword')

      // cryptoMock.randomBytes is now a Jest mock function
      cryptoMock.randomBytes.mockReturnValue({ toString: () => 'mockGeneratedSessionToken' } as any) // Cast to any if Buffer type causes issues with simple toString mock
      ;(EmailValidatorMock.validate as jest.Mock).mockReturnValue(true)
      mockPasswordValidatorValidate = jest.fn().mockReturnValue(true)
   })

   // --- POST /auth/login ---
   describe('POST /auth/login', () => {
      const loginCredentialsEmail = { email: 'test@example.com', password: 'password123' }
      const loginCredentialsLogin = { login: 'testuser', password: 'password123' }
      const mockUser = {
         id: 1,
         email: 'test@example.com',
         login: 'testuser',
         password: 'hashedDbPassword',
         role: 'STUDENT',
         isEmailConfirmed: true,
      }

      it('should login with email and password successfully', async () => {
         ;(prismaMock.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
         ;(bcryptMock.compare as jest.Mock).mockResolvedValue(true)
         cryptoMock.randomBytes.mockReturnValue({ toString: () => 'emailLoginToken' } as any)

         const res = await request(app).post('/auth/login').send(loginCredentialsEmail)

         expect(res.status).toBe(200)
         expect(res.body.message).toBe('Logged In')
         expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
            where: { OR: [{ email: loginCredentialsEmail.email }, { login: undefined }] },
         })
         expect(bcryptMock.compare).toHaveBeenCalledWith(
            loginCredentialsEmail.password,
            mockUser.password
         )
         expect(prismaMock.session.create).toHaveBeenCalledWith(
            expect.objectContaining({
               data: { token: 'emailLoginToken', expiredAt: expect.any(Date), userId: mockUser.id },
            })
         )
         expect(res.headers['set-cookie']).toEqual(
            expect.arrayContaining([
               expect.stringContaining('session_token=emailLoginToken'),
               expect.stringContaining('HttpOnly'),
               expect.stringContaining('Secure'),
               expect.stringContaining('SameSite=None'),
               expect.stringContaining(`role=${mockUser.role}`),
               expect.stringContaining(`user_id=${mockUser.id}`),
            ])
         )
      })

      it('should login with login and password successfully', async () => {
         ;(prismaMock.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
         ;(bcryptMock.compare as jest.Mock).mockResolvedValue(true)
         cryptoMock.randomBytes.mockReturnValue({ toString: () => 'userLoginToken' } as any)

         const res = await request(app).post('/auth/login').send(loginCredentialsLogin)

         expect(res.status).toBe(200)
         // ... (rest of assertions are the same)
         expect(res.body.message).toBe('Logged In')
         expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
            where: { OR: [{ email: undefined }, { login: loginCredentialsLogin.login }] },
         })
         expect(res.headers['set-cookie']).toEqual(
            expect.arrayContaining([
               expect.stringContaining('session_token=userLoginToken'),
               expect.stringContaining(`role=${mockUser.role}`),
            ])
         )
      })

      it('should return 400 if email or login is not provided', async () => {
         const res = await request(app).post('/auth/login').send({ password: 'password123' })
         expect(res.status).toBe(400)
         expect(res.body.message).toBe('Email or login is required')
      })

      it('should return 400 if password is not provided', async () => {
         const res = await request(app).post('/auth/login').send({ email: 'test@example.com' })
         expect(res.status).toBe(400)
         expect(res.body.message).toBe('Password is required')
      })

      it('should return 401 if user not found', async () => {
         ;(prismaMock.user.findFirst as jest.Mock).mockResolvedValue(null)
         const res = await request(app).post('/auth/login').send(loginCredentialsEmail)
         expect(res.status).toBe(401)
         expect(res.body.message).toBe('Invalid credentials')
      })

      it('should return 401 if password does not match', async () => {
         ;(prismaMock.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
         ;(bcryptMock.compare as jest.Mock).mockResolvedValue(false)
         const res = await request(app).post('/auth/login').send(loginCredentialsEmail)
         expect(res.status).toBe(401)
         expect(res.body.message).toBe('Invalid credentials')
      })

      it('should return 500 on Prisma error', async () => {
         ;(prismaMock.user.findFirst as jest.Mock).mockRejectedValue(
            new Error('Database connection failed')
         )
         const res = await request(app).post('/auth/login').send(loginCredentialsEmail)
         expect(res.status).toBe(500)
         expect(res.body.message).toContain(
            'Internal Server Error: Error: Database connection failed'
         )
      })
   })

   // --- POST /auth/logout ---
   describe('POST /auth/logout', () => {
      const validSessionToken = 'validClientSessionToken'
      const mockSessionData = {
         // Renamed to avoid conflict if mockSession is used elsewhere
         id: 1,
         token: validSessionToken,
         expiredAt: new Date(Date.now() + 3600000),
         userId: 1,
      }

      it('should logout successfully if session is valid', async () => {
         ;(prismaMock.session.findFirst as jest.Mock).mockResolvedValue(mockSessionData)
         const res = await request(app)
            .post('/auth/logout')
            .set('Cookie', `session_token=${validSessionToken}`)

         expect(res.status).toBe(200)
         // ... (rest of assertions are the same)
         expect(res.body.message).toBe('Logged Out')
         expect(prismaMock.session.findFirst).toHaveBeenCalledWith({
            where: { token: validSessionToken },
         })
         expect(prismaMock.session.delete).toHaveBeenCalledWith({
            where: { id: mockSessionData.id },
         })
         expect(res.headers['set-cookie']).toEqual(
            expect.arrayContaining([
               expect.stringMatching(/session_token=;.*Max-Age=0|session_token=;.*Expires=.*1970/),
            ])
         )
      })

      it('should return 401 if no session_token cookie is present', async () => {
         const res = await request(app).post('/auth/logout')
         expect(res.status).toBe(401)
         expect(res.body.message).toBe('Unauthorized')
      })

      it('should return 401 if session token is invalid or session not found', async () => {
         ;(prismaMock.session.findFirst as jest.Mock).mockResolvedValue(null)
         const res = await request(app)
            .post('/auth/logout')
            .set('Cookie', 'session_token=invalidOrMissingToken')

         expect(res.status).toBe(401)
         // ... (rest of assertions are the same)
         expect(res.body.message).toBe('Invalid session or already logged out')
         expect(res.headers['set-cookie']).toEqual(
            expect.arrayContaining([
               expect.stringMatching(/session_token=;.*Max-Age=0|session_token=;.*Expires=.*1970/),
            ])
         )
      })

      it('should return 401 and delete session if it has expired', async () => {
         const expiredSession = { ...mockSessionData, expiredAt: new Date(Date.now() - 10000) }
         ;(prismaMock.session.findFirst as jest.Mock).mockResolvedValue(expiredSession)
         const res = await request(app)
            .post('/auth/logout')
            .set('Cookie', `session_token=${validSessionToken}`)

         expect(res.status).toBe(401)
         // ... (rest of assertions are the same)
         expect(res.body.message).toBe('Session expired')
         expect(prismaMock.session.delete).toHaveBeenCalledWith({
            where: { id: expiredSession.id },
         })
         expect(res.headers['set-cookie']).toEqual(
            expect.arrayContaining([
               expect.stringMatching(/session_token=;.*Max-Age=0|session_token=;.*Expires=.*1970/),
            ])
         )
      })
      it('should return 500 on Prisma error', async () => {
         ;(prismaMock.session.findFirst as jest.Mock).mockRejectedValue(new Error('DB down'))
         const res = await request(app)
            .post('/auth/logout')
            .set('Cookie', `session_token=${validSessionToken}`)
         expect(res.status).toBe(500)
         expect(res.body.message).toContain('Internal Server Error: Error: DB down')
      })
   })

   // --- POST /auth/register ---
   describe('POST /auth/register', () => {
      const validUserData = {
         first_name: 'Test',
         last_name: 'User',
         email: 'test.register@example.com',
         login: 'testregister',
         password: 'Password123',
         phone_number: '1234567890',
         birth_date: '1990-01-01',
         street: '123 Main St',
         house: 'Apt 4B',
         city: 'Testville',
         zip: '12345',
         country: 'Testland',
      }

      it('should register a new user successfully', async () => {
         ;(prismaMock.user.findFirst as jest.Mock).mockResolvedValue(null)
         ;(EmailValidatorMock.validate as jest.Mock).mockReturnValue(true)
         mockPasswordValidatorValidate.mockReturnValue(true)
         ;(prismaMock.address.create as jest.Mock).mockResolvedValue({ id: 10, ...validUserData })
         ;(prismaMock.user.create as jest.Mock).mockResolvedValue({
            id: 20,
            ...validUserData,
            role: 'STUDENT',
         })

         const res = await request(app).post('/auth/register').send(validUserData)

         expect(res.status).toBe(201)
         // ... (rest of assertions are the same)
         expect(res.body.message).toBe('User created')
         expect(prismaMock.user.findFirst).toHaveBeenCalledTimes(3)
         expect(prismaMock.user.findFirst).toHaveBeenNthCalledWith(1, {
            where: { login: validUserData.login },
         })
         expect(EmailValidatorMock.validate).toHaveBeenCalledWith(validUserData.email)
         expect(prismaMock.user.findFirst).toHaveBeenNthCalledWith(2, {
            where: { email: validUserData.email },
         })
         expect(prismaMock.user.findFirst).toHaveBeenNthCalledWith(3, {
            where: { phoneNumber: validUserData.phone_number },
         })
         expect(mockPasswordValidatorValidate).toHaveBeenCalledWith(validUserData.password)
         expect(bcryptMock.hash).toHaveBeenCalledWith(validUserData.password, 10)
         expect(prismaMock.address.create).toHaveBeenCalledWith({
            data: {
               street: validUserData.street,
               house: validUserData.house,
               city: validUserData.city,
               zip: validUserData.zip,
               country: validUserData.country,
            },
         })
         expect(prismaMock.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
               data: {
                  firstName: validUserData.first_name,
                  lastName: validUserData.last_name,
                  email: validUserData.email,
                  login: validUserData.login,
                  password: 'mockHashedPassword',
                  phoneNumber: validUserData.phone_number,
                  isEmailConfirmed: false,
                  birthDate: new Date(validUserData.birth_date),
                  role: 'STUDENT',
                  addressId: 10,
               },
            })
         )
      })

      it('should return 400 if any required data is missing', async () => {
         const { first_name, ...incompleteData } = validUserData
         const res = await request(app).post('/auth/register').send(incompleteData)
         expect(res.status).toBe(400)
         expect(res.body.message).toBe('Provide all required data')
      })

      it('should return 400 if login already exists', async () => {
         ;(prismaMock.user.findFirst as jest.Mock).mockResolvedValueOnce({
            id: 2,
            login: validUserData.login,
         })
         const res = await request(app).post('/auth/register').send(validUserData)
         expect(res.status).toBe(400)
         expect(res.body.message).toBe('Login already exists')
      })

      it('should return 400 if email is invalid', async () => {
         ;(EmailValidatorMock.validate as jest.Mock).mockReturnValue(false)
         const res = await request(app).post('/auth/register').send(validUserData)
         expect(res.status).toBe(400)
         expect(res.body.message).toBe('Email is invalid')
      })

      it('should return 400 if email already exists', async () => {
         ;(prismaMock.user.findFirst as jest.Mock)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 2, email: validUserData.email })
         const res = await request(app).post('/auth/register').send(validUserData)
         expect(res.status).toBe(400)
         expect(res.body.message).toBe('Email already exists')
      })

      it('should return 400 if phone number already exists', async () => {
         ;(prismaMock.user.findFirst as jest.Mock)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 2, phoneNumber: validUserData.phone_number })
         const res = await request(app).post('/auth/register').send(validUserData)
         expect(res.status).toBe(400)
         expect(res.body.message).toBe('Phone number already exists')
      })

      it('should return 400 if birth date is in the future', async () => {
         const futureDate = new Date()
         futureDate.setDate(futureDate.getDate() + 1)
         const res = await request(app)
            .post('/auth/register')
            .send({
               ...validUserData,
               birth_date: futureDate.toISOString().split('T')[0],
            })
         expect(res.status).toBe(400)
         expect(res.body.message).toBe('Birth date is invalid')
      })

      it('should return 400 if password is weak', async () => {
         mockPasswordValidatorValidate.mockReturnValue(false)
         const res = await request(app)
            .post('/auth/register')
            .send({ ...validUserData, password: 'weak' })
         expect(res.status).toBe(400)
         expect(res.body.message).toBe(
            'Password must be at least 8 characters long, have at least 1 uppercase letter, 1 lowercase letter, and 1 digit'
         )
      })

      it('should return 500 on Prisma error during address creation', async () => {
         ;(prismaMock.address.create as jest.Mock).mockRejectedValue(new Error('Address DB error'))
         const res = await request(app).post('/auth/register').send(validUserData)
         expect(res.status).toBe(500)
         expect(res.body.message).toContain('Internal Server Error: Error: Address DB error')
      })
      it('should return 500 on Prisma error during user creation', async () => {
         ;(prismaMock.user.create as jest.Mock).mockRejectedValue(new Error('User DB error'))
         const res = await request(app).post('/auth/register').send(validUserData)
         expect(res.status).toBe(500)
         expect(res.body.message).toContain('Internal Server Error: Error: User DB error')
      })
   })
})
