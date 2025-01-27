import express, { Request, Response } from 'express'
import authRouter from './routes/auth'
// import { sessionVerify } from './middleware/session_verify'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'

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
// TODO: Uncomment the following lines after creating the teacherRouter and studentRouter
// app.use('/dashboard/teacher', sessionVerify, teacherRouter)
// app.use('/dashboard/student', sessionVerify, studentRouter)

app.listen(PORT, () => {
   console.log(`Server is running on http://localhost:${PORT}`)
})
