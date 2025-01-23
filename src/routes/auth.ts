import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { SESSION_EXPIRY_TIME } from '../config/globals'
import * as EmailValidator from 'email-validator'
import passwordValidator from 'password-validator'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

const authRouter = express.Router()
const prisma = new PrismaClient()

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
   try {
      const { email, login, password } = req.body

      if (!email && !login) {
         res.status(400).json({ message: 'Email or login is required' })
         return
      }
      if (!password) {
         res.status(400).json({ message: 'Password is required' })
         return
      }

      const user = await prisma.user.findFirst({
         where: {
            OR: [{ email }, { login }],
         },
      })

      if (!user || !(await bcrypt.compare(password, user.password))) {
         res.status(401).json({ message: 'Invalid credentials' })
         return
      }

      // commented out because we don't have email confirmation yet
      // if (!user.isEmailConfirmed) {
      //    res.status(401).json({ message: 'Email is not confirmed' })
      //    return
      // }

      const sessionToken = crypto.randomBytes(16).toString('hex')
      await prisma.session.create({
         data: {
            token: sessionToken,
            expiredAt: new Date(new Date().getTime() + SESSION_EXPIRY_TIME),
            userId: user.id,
         },
      })

      res.status(200)
         .cookie('session_token', sessionToken, {
            httpOnly: true,
            secure: true,
            expires: new Date(new Date().getTime() + SESSION_EXPIRY_TIME),
         }) // 1 hour
         .cookie('role', user.role)
         .json({ message: 'Logged In' })
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

authRouter.post('/logout', async (req: Request, res: Response): Promise<void> => {
   try {
      if (!req.cookies) {
         res.status(401).json({ message: 'Unauthorized' })
         return
      }
      const { session_token } = req.cookies

      if (!session_token) {
         res.status(401).json({ message: 'Unauthorized' })
         return
      }

      const session = await prisma.session.findFirst({
         where: { token: session_token },
      })

      if (!session) {
         res.status(401)
            .clearCookie('session_token')
            .json({ message: 'Invalid session or already logged out' })
         return
      }

      if (session.expiredAt < new Date()) {
         await prisma.session.delete({ where: { id: session.id } })
         res.status(401).clearCookie('session_token').json({ message: 'Session expired' })
         return
      }

      await prisma.session.delete({ where: { id: session.id } })
      res.status(200).clearCookie('session_token').json({ message: 'Logged Out' })
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
   try {
      const { first_name, last_name, email, login, password, phone_number, birth_date } = req.body
      // adress
      const { street, house, city, zip, country } = req.body

      if (
         ![
            first_name,
            last_name,
            email,
            login,
            password,
            phone_number,
            birth_date,
            street,
            house,
            city,
            zip,
            country,
         ].every(Boolean)
      ) {
         res.status(400).json({ message: 'Provide all required data' })
         return
      }
      // check if login already exists
      let user = await prisma.user.findFirst({
         where: {
            login: login,
         },
      })
      if (user) {
         res.status(400).json({ message: 'Login already exists' })
         return
      }

      // check if email is valid
      if (!EmailValidator.validate(email)) {
         res.status(400).json({ message: 'Email is invalid' })
         return
      }

      // check if email already exists
      user = await prisma.user.findFirst({
         where: {
            email: email,
         },
      })
      if (user) {
         res.status(400).json({ message: 'Email already exists' })
         return
      }

      // check if phone number already exists
      user = await prisma.user.findFirst({
         where: {
            phoneNumber: phone_number,
         },
      })
      if (user) {
         res.status(400).json({ message: 'Phone number already exists' })
         return
      }

      // check if birthdate is valid
      if (new Date(birth_date) > new Date()) {
         res.status(400).json({ message: 'Birth date is invalid' })
         return
      }

      // check if password is strong
      const schema = new passwordValidator()
      schema.is().min(8).is().max(100).has().uppercase().has().lowercase().has().digits()
      if (!schema.validate(password)) {
         res.status(400).json({
            message:
               'Password must be at least 8 characters long, have at least 1 uppercase letter, 1 lowercase letter, and 1 digit',
         })
         return
      }

      // hash password

      const hashedPassword = await bcrypt.hash(password, 10)

      // create address
      const address = await prisma.address.create({
         data: {
            street: street,
            house: house,
            city: city,
            zip: zip,
            country: country,
         },
      })

      // create user
      await prisma.user.create({
         data: {
            firstName: first_name,
            lastName: last_name,
            email: email,
            login: login,
            password: hashedPassword,
            isEmailConfirmed: false,
            phoneNumber: phone_number,
            birthDate: new Date(birth_date),
            addressId: address.id,
            role: 'STUDENT',
         },
      })
      res.status(201).json({ message: 'User created' })
   } catch (error) {
      res.status(500).json({ message: `Internal Server Error: ${error}` })
   }
})

export default authRouter
