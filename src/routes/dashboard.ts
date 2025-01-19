import express, { Request, Response } from 'express'
// import { PrismaClient } from '@prisma/client'

const dashboardRouter = express.Router()
// const prisma = new PrismaClient()

dashboardRouter.post('/grades', async (req: Request, res: Response): Promise<void> => {
   // not implemented
   res.status(501).json({ message: 'Not Implemented' })
})

export default dashboardRouter
