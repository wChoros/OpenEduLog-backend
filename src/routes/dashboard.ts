import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const dashboardRouter = express.Router()
const prisma = new PrismaClient()

