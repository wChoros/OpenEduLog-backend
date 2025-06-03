/**
 * Router for handling message-related operations.
 *
 * Endpoints:
 *
 * - `GET /headers/received/:userId`
 *   Retrieves a list of received message headers for a specific user.
 *   - Path Parameters:
 *     - `userId` (string): The ID of the user whose received messages are being retrieved.
 *   - Request Body:
 *     - `user` (object): The authenticated user object.
 *   - Response:
 *     - `200 OK`: An array of message headers with metadata.
 *     - `403 Forbidden`: If the user tries to access messages of another user.
 *
 * - `GET /headers/sent/:userId/:offset?`
 *   Retrieves a list of sent message headers for a specific user with optional pagination. The max amount of returned messages is 25
 *   - Path Parameters:
 *     - `userId` (string): The ID of the user whose sent messages are being retrieved.
 *     - `offset` (string, optional): The pagination offset (default is 0).
 *   - Request Body:
 *     - `user` (object): The authenticated user object.
 *   - Response:
 *     - `200 OK`: An array of sent message headers with metadata.
 *     - `400 Bad Request`: If the offset is invalid.
 *     - `403 Forbidden`: If the user tries to access messages of another user.
 *
 * - `GET /content/received/:messageId`
 *   Retrieves the content of a received message for the authenticated user.
 *   - Path Parameters:
 *     - `messageId` (string): The ID of the message being retrieved.
 *   - Request Body:
 *     - `user` (object): The authenticated user object.
 *   - Response:
 *     - `200 OK`: The full content of the message.
 *     - `403 Forbidden`: If the user is not a receiver of the message.
 *
 * - `GET /content/sent/:messageId`
 *   Retrieves the content of a sent message for the authenticated user.
 *   - Path Parameters:
 *     - `messageId` (string): The ID of the message being retrieved.
 *   - Request Body:
 *     - `user` (object): The authenticated user object.
 *   - Response:
 *     - `200 OK`: The full content of the message with receiver details.
 *     - `403 Forbidden`: If the user is not the author of the message.
 *     - `404 Not Found`: If the message does not exist.
 *
 * - `POST /`
 *   Creates a new message and sends it to specified receivers.
 *   - Request Body:
 *     - `user` (object): The authenticated user object.
 *     - `title` (string): The title of the message.
 *     - `content` (string): The content of the message.
 *     - `receivers` (number[]): An array of user IDs to whom the message will be sent.
 *   - Response:
 *     - `201 Created`: The created message object.
 *     - `404 Not Found`: If any of the specified receivers do not exist.
 *
 * - `DELETE /:messageId`
 *   Deletes a message authored by the authenticated user.
 *   - Path Parameters:
 *     - `messageId` (string): The ID of the message to be deleted.
 *   - Request Body:
 *     - `user` (object): The authenticated user object.
 *   - Response:
 *     - `204 No Content`: If the message is successfully deleted.
 *     - `403 Forbidden`: If the user is not the author of the message.
 *     - `404 Not Found`: If the message does not exist.
 */

import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const messagesRouter = express.Router()
const prisma = new PrismaClient()

messagesRouter.get('/headers/received/:userId/:offset?', async (req: Request, res: Response) => {
   const { userId, offset } = req.params
   const user = req.body.user

   let offsetValue: number
   let take = 20
   if (offset === null) {
      offsetValue = 0
   } else {
      offsetValue = parseInt(offset)
      if (isNaN(offsetValue)) {
         res.status(400).json({ message: 'Invalid offset' })
         return
      }
   }

   if (offsetValue < 0) {
      take = take - offsetValue >= 0 ? take - offsetValue : 0
      offsetValue = 0
   }

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
         content: true,
         author: {
            select: {
               id: true,
               firstName: true,
               lastName: true,
            },
         },
         updatedAt: true,
         receivers: {
            where: {
               userId: parseInt(userId),
            },
            select: {
               isRead: true,
            },
         },
      },
      orderBy: {
         updatedAt: 'desc',
      },
      skip: offsetValue,
      take: take,
   })

   // Transform the result to match the requested format
   const result = messages.map((msg) => ({
      messageId: msg.id,
      messageTitle: msg.title,
      messageContent: msg.content.slice(0, 50),
      date: msg.updatedAt,
      isRead: msg.receivers[0].isRead,
      senderId: msg.author.id,
      senderName: `${msg.author.firstName} ${msg.author.lastName}`,
   }))

   res.json(result)
   return
})

messagesRouter.get('/headers/sent/:userId/:offset?', async (req: Request, res: Response) => {
   const { userId, offset_str } = req.params
   const user = req.body.user

   let offset: number
   let take = 20
   if (offset_str === null) {
      offset = 0
   } else {
      offset = parseInt(offset_str)
      if (isNaN(offset)) {
         res.status(400).json({ message: 'Invalid offset' })
         return
      }
   }
   // user can only see their own messages
   if (user.id !== parseInt(userId)) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

   if (offset < 0) {
      take = take - offset >= 0 ? take - offset : 0
      offset = 0
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
      skip: offset,
      take: take,
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

messagesRouter.get('/content/received/:messageId/', async (req: Request, res: Response) => {
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
         updatedAt: true,
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
               user: {
                  select: {
                     id: true,
                     firstName: true,
                     lastName: true,
                  },
               },
            },
         },
      },
   })

   if (!message) {
      res.status(403).json({ message: 'Forbidden' })
      return
   }

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

   const response = {
      id: message.id,
      title: message.title,
      content: message.content,
      date: message.updatedAt,
      senderId: message.author.id,
      senderName: `${message.author.firstName} ${message.author.lastName}`,
      receivers: message.receivers.map((receiver) => ({
         id: receiver.user.id,
         name: `${receiver.user.firstName} ${receiver.user.lastName}`,
         isRead: receiver.isRead,
      })),
   }

   res.status(200).json(response)
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
