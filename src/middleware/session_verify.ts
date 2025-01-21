import { PrismaClient } from '@prisma/client'
import { NextFunction, Request, Response } from 'express'
import { SESSION_EXPIRY_TIME } from '../config/globals'

const prisma = new PrismaClient()

export const sessionVerify = async (
   req: Request,
   res: Response,
   next: NextFunction
): Promise<void> => {
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
      where: {
         token: session_token,
      },
   })
   console.log(session)

   if (!session) {
      res.status(401).json({ message: 'Invalid session' })
      return
   }

   if (session.expiredAt < new Date()) {
      await prisma.session.delete({
         where: {
            id: session.id,
         },
      })
      res.status(401).json({ message: 'Session expired' })
      return
   }

   await prisma.session.update({
      where: {
         id: session.id,
      },
      data: {
         expiredAt: new Date(new Date().getTime() + SESSION_EXPIRY_TIME),
      },
   })

   req.body.user = await prisma.user.findFirst({
      where: {
         id: session.userId,
      },
   })

   next()
}
