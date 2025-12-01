import { DefaultSession } from 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      roles: string[]
      id: string
    }
  }

  interface User {
    invalidateSessionsBefore?: Date | null
    rememberMe?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    iat?: number
    id?: string
    invalidateBefore?: number
    lastCheckedAt?: number
    rememberMe?: boolean
    roles?: string[]
  }
}
