import { Request, Response, NextFunction, RequestHandler } from 'express'
import defineAbilityFor from '../RBAC/abilities'
import { Actions, Subjects } from '../RBAC/abilities'
import { Grade } from '../RBAC/models'
import { Group } from '../RBAC/models'
import { Subject } from '../RBAC/models'
import { Timetable } from '../RBAC/models'
import { Message } from '../RBAC/models'

export const authorize = (
   action: Actions,
   subject: Subjects,
   getId?: (req: Request) => number | undefined
): RequestHandler => {
   return async (req: Request, res: Response, next: NextFunction): Promise <void> => {
      const id = getId ? getId(req) : undefined

      const user = req.body.user


      console.log('User:', user)
      console.log('Action:', action)
      console.log('Subject:', subject)


      if (!user) {
         console.log('Undefined user.')
         res.status(401).json({ message: 'Unauthorized' })
         return
      }

      if (!id) {
         console.log('Undefined ID.')
         res.status(400).json({ message: 'ID not provided' })
         return
      }

      if (isNaN(id)) {
         console.log('Invalid ID in params.')
         res.status(400).json({ message: 'Invalid ID' })
         return
      }

      console.log(`Checking if user ${user.id} can ${action} on ${subject} with ID ${id}`)

      const SomeClass = returnClassOnSubject(subject)
      let someData = new SomeClass(id)

      const ability = defineAbilityFor(user)

      console.log('Subject instance:', someData)

      if (ability.can(action, someData)) {
         console.log('Access granted.')
         return next()
      }

      console.log('Access denied.')
      res.status(403).json({ message: 'Forbidden' })
   }
}

function returnClassOnSubject(
   subject: Subjects
): new (id: number) => Grade | Group | Subject | Timetable | Message {
   switch (subject) {
      case 'Grade':
         return Grade
      case 'Group':
         return Group
      case 'Subject':
         return Subject
      case 'Timetable':
         return Timetable
      case 'Message':
         return Message
      default:
         throw new Error(`Invalid subject: ${subject}`)
   }
}
