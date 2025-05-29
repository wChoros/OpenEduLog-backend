import express, { Request, Response } from 'express'
import authRouter from './routes/auth'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from 'cors'

import { sessionVerify } from './middleware/session_verify'
import gradesRouter from './routes/grades'
import groupsRouter from './routes/groups'
import subjectsRouter from './routes/subjects'
import timetablesRouter from './routes/timetables'
import messagesRouter from './routes/messages'

dotenv.config()

const app = express()
app.disable('x-powered-by')
const PORT = process.env.PORT
const corsOptions = {
   origin: 'http://localhost:5173',
   credentials: true,
}

// Middleware to parse JSON
app.use(cors(corsOptions))
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
app.use('/timetables', sessionVerify, timetablesRouter)
app.use('/messages', sessionVerify, messagesRouter)

app.listen(PORT, () => {
   console.log(`Server is running on http://localhost:${PORT}`)
})
