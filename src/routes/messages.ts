import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const messagesRouter = express.Router()
const prisma = new PrismaClient()

messagesRouter.get('headers/received/:userId', async (req: Request, res: Response) => {
   const { userId } = req.params
   const user = req.body.user

   // user can only see their own messages
   if (user.id !== parseInt(userId)) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   const messages = await prisma.message.findMany({
      where: {
         receivers: {
            some: {
               userId: parseInt(userId),
            },
         },
      },
      select: {
         id: true,
         title: true,
         author: {
            select: {
               id: true,
               firstName: true,
               lastName: true,
            },
         },
      },
   })

   // Transform the result to match the requested format
   const result = messages.map((msg) => ({
      messageId: msg.id,
      messageTitle: msg.title,
      senderId: msg.author.id,
      senderName: `${msg.author.firstName} ${msg.author.lastName}`,
   }))

   res.json(result)
   return
})

messagesRouter.get('/content/recieved/:messageId/', async (req: Request, res: Response) => {
   const { messageId } = req.params
   const user = req.body.user

   // only receiver can see the message
   const message = await prisma.message.findFirst({
      where: {
         id: parseInt(messageId),
         receivers: {
            some: {
               userId: user.id,
            },
         },
      },
      select: {
         id: true,
         title: true,
         content: true,
         author: {
            select: {
               id: true,
               firstName: true,
               lastName: true,
            },
         },
         receivers: {
            select: {
               isRead: true,
            },
         },
      },
   })

   await prisma.message.update({
      where: {
         id: parseInt(messageId),
      },
      data: {
         receivers: {
            update: {
               where: {
                  userId_messageId: {
                     userId: user.id,
                     messageId: parseInt(messageId),
                  },
               },
               data: {
                  isRead: true,
               },
            },
         },
      },
   })

   if (!message) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   res.status(200).json(message)
})

messagesRouter.get('/headers/sent/:userId', async (req: Request, res: Response) => {
   const { userId } = req.params
   const user = req.body.user

   // user can only see their own messages
   if (user.id !== parseInt(userId)) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   const messages = await prisma.message.findMany({
      where: {
         authorId: parseInt(userId),
      },
      select: {
         id: true,
         title: true,
         receivers: {
            select: {
               userId: true,
               user: {
                  select: {
                     firstName: true,
                     lastName: true,
                  },
               },
               isRead: true,
            },
         },
      },
   })

   // Transform the result to match the requested format
   // one message can be sent to multiple users
   const result = messages.map((msg) => ({
      messageId: msg.id,
      messageTitle: msg.title,
      receivers: msg.receivers.map((receiver) => ({
         receiverId: receiver.userId,
         receiverName: `${receiver.user.firstName} ${receiver.user.lastName}`,
         isRead: receiver.isRead,
      })),
   }))

   res.json(result)
   return
})

messagesRouter.get('/content/sent/:messageId', async (req: Request, res: Response) => {
   const user = req.body.user
   const { messageId } = req.params

   // only author can see the message
   const message = await prisma.message.findFirst({
      where: {
         id: parseInt(messageId),
      },
      select: {
         id: true,
         title: true,
         content: true,
         authorId: true,
         receivers: {
            select: {
               userId: true,
               user: {
                  select: {
                     firstName: true,
                     lastName: true,
                  },
               },
               isRead: true,
            },
         },
      },
   })

   if (!message) {
      res.status(404).json({ message: 'Not Found' })
      return
   }

   if (message.authorId !== user.id) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   const result = {
      messageId: message.id,
      messageTitle: message.title,
      messageContent: message.content,
      receivers: message.receivers.map((receiver) => ({
         receiverId: receiver.userId,
         receiverName: `${receiver.user.firstName} ${receiver.user.lastName}`,
         isRead: receiver.isRead,
      })),
   }

   res.status(200).json(result)
})

messagesRouter.post('/', async (req: Request, res: Response) => {
   const user = req.body.user
   const { title, content, receivers } = req.body

   // check if all receivers exist
   const users = await prisma.user.findMany({
      where: {
         id: {
            in: receivers,
         },
      },
   })

   if (users.length !== receivers.length) {
      res.status(404).json({ message: 'Not Found' })
      return
   }

   // create message
   const message = await prisma.message.create({
      data: {
         title,
         content,
         authorId: user.id,
         receivers: {
            create: receivers.map((receiver: number) => ({
               userId: receiver,
            })),
         },
      },
   })
   res.status(201).json(message)
})

messagesRouter.delete('/:messageId', async (req: Request, res: Response) => {
   const user = req.body.user
   const { messageId } = req.params

   // check if message exists
   const message = await prisma.message.findFirst({
      where: {
         id: parseInt(messageId),
      },
   })

   if (!message) {
      res.status(404).json({ message: 'Not Found' })
      return
   }

   // only author can delete the message
   if (message.authorId !== user.id) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   await prisma.message.delete({
      where: {
         id: parseInt(messageId),
      },
   })

   res.status(204).json({ message: 'Message deleted' })
})

export default messagesRouter
