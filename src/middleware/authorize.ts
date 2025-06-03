import { Request, Response, NextFunction } from 'express'
import { defineAbilitiesFor } from '../RBAC/abilities'
import { Actions, Subjects } from '../RBAC/abilities'

//middleware to check if user is authorized to perform action on subject based on the user's role (abilities.ts)
export const authorize = (action: Actions, subject: Subjects) => {
   return (req: Request, res: Response, next: NextFunction) => {
      const user = req.body.user

      if (!user) {
         console.log('Undefined user.')
         res.status(401).json({ message: 'Unauthorized' })
         return
      }

      const ability = defineAbilitiesFor(user)
      console.log(`Checking if user can ${action} on ${subject}`)

      if (ability.can(action, subject)) {
         console.log('Access granted.')
         next()
      } else {
         console.log('Access denied.')
         res.status(403).json({ message: 'Forbidden' })
      }
   }
}
