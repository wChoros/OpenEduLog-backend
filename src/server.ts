import express, { Request, Response } from 'express'
import authRouter from './routes/auth'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'

import { sessionVerify } from './middleware/session_verify'
import gradesRouter from './routes/grades'
import groupsRouter from './routes/groups'
import subjectsRouter from './routes/subjects'

dotenv.config()

const app = express()
app.disable('x-powered-by')
const PORT = process.env.PORT

// Middleware to parse JSON
app.use(express.json())
app.use(cookieParser())

// Simple route
app.get('/', (req: Request, res: Response) => {
   res.send('Hello, World!')
})

app.use('/auth', authRouter)
app.use('/grades', sessionVerify, gradesRouter)
app.use('/groups', sessionVerify, groupsRouter)
app.use('/subjects', sessionVerify, subjectsRouter)

app.listen(PORT, () => {
   console.log(`Server is running on http://localhost:${PORT}`)
})
