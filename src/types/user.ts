interface User {
   id: number
   firstName: string
   lastName: string
   email: string
   login: string
   password: string
   isEmailConfirmed: boolean
   phoneNumber: string
   birthDate: Date
   addressId: number
   role: string
}

export default User