export class Entity {
   studentId: number
   userId: number
   authorId: number
   teacherId: number

   constructor(id: number) {
      this.studentId = id
      this.teacherId = id
      this.authorId = id
      this.userId = id
   }
}

export class Grade extends Entity {}
export class Group extends Entity {}
export class Subject extends Entity {}
export class Timetable extends Entity {}
export class Message extends Entity {}
