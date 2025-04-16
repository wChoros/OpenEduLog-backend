// app.ts
import express from 'express'
import subjectsRouter from './routes/subjects'
import gradesRouter from './routes/grades'
import groupsRouter from './routes/groups'
import messagesRouter from './routes/messages'
import timetableRouter from './routes/timetables'


const app = express()
app.use(express.json())
app.use('/subjects', subjectsRouter)
app.use('/grades', gradesRouter)
app.use('/groups', groupsRouter)
app.use('/messages', messagesRouter)
app.use('/timetable', timetableRouter)

export default app
