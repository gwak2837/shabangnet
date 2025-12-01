import { DrizzleAdapter } from '@auth/drizzle-adapter'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import ms from 'ms'
import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import Kakao from 'next-auth/providers/kakao'
import Naver from 'next-auth/providers/naver'
import { z } from 'zod'

import { env } from '@/common/env'
import { db } from '@/db/client'
import { roles, users, usersToRoles } from '@/db/schema/auth'
import { processLoginAttempt } from '@/lib/auth/login-limiter'

import { sec } from './utils/sec'

const apiAuthPrefix = '/api/auth'
const DEFAULT_LOGIN_REDIRECT = '/dashboard'
const publicRoutes = ['']
const authRoutes = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/unlock-account']

class AccountLockedError extends CredentialsSignin {
  code = 'account_locked'
}

class TooManyAttemptsError extends CredentialsSignin {
  code = 'too_many_attempts'
}

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
  rememberMe: z.string().optional(),
})

async function getUserRoles(userId: string) {
  try {
    const userRoles = await db
      .select({
        name: roles.name,
      })
      .from(usersToRoles)
      .innerJoin(roles, eq(usersToRoles.roleId, roles.id))
      .where(eq(usersToRoles.userId, userId))

    return userRoles.map((r) => r.name)
  } catch (error) {
    console.error('getUserRoles:', error)
    return []
  }
}

async function getUserWithRoles(userId: string) {
  try {
    const result = await db
      .select({
        user: users,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(usersToRoles, eq(users.id, usersToRoles.userId))
      .leftJoin(roles, eq(usersToRoles.roleId, roles.id))
      .where(eq(users.id, userId))

    if (result.length === 0) {
      return null
    }

    const user = result[0].user
    const userRoles = result.filter((r) => r.roleName !== null).map((r) => r.roleName!)

    return {
      ...user,
      roles: userRoles,
    }
  } catch (error) {
    console.error('getUserWithRoles:', error)
    return null
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  pages: {
    signIn: '/login',
    newUser: '/register',
    verifyRequest: '/verify-email',
  },
  adapter: DrizzleAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: sec('30d'),
  },
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
    Kakao({
      clientId: env.AUTH_KAKAO_ID,
      clientSecret: env.AUTH_KAKAO_SECRET,
    }),
    Naver({
      clientId: env.AUTH_NAVER_ID,
      clientSecret: env.AUTH_NAVER_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = schema.safeParse(credentials)

        if (!parsedCredentials.success) {
          return null
        }

        const { email, password, rememberMe } = parsedCredentials.data
        const [user] = await db.select().from(users).where(eq(users.email, email))

        if (!user || !user.password) {
          const result = await processLoginAttempt(email, false)

          if (result.isLocked) {
            throw result.wasAlreadyLocked ? new AccountLockedError() : new TooManyAttemptsError()
          }

          return null
        }

        const passwordsMatch = await bcrypt.compare(password, user.password)
        const result = await processLoginAttempt(email, passwordsMatch)

        if (result.isLocked) {
          // 이미 잠긴 계정이었거나, 이번 시도로 잠김
          throw result.wasAlreadyLocked ? new AccountLockedError() : new TooManyAttemptsError()
        }

        if (!passwordsMatch) {
          console.log(`Login failed for ${email}. Attempts remaining: ${result.attemptsRemaining}`)
          return null
        }

        return {
          ...user,
          rememberMe: rememberMe === 'true',
        }
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
      const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
      const isAuthRoute = authRoutes.includes(nextUrl.pathname)

      if (isApiAuthRoute) {
        return true
      }

      if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
        }
        return true
      }

      if (!isLoggedIn && !isPublicRoute) {
        return false
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roles = await getUserRoles(user.id!)
        token.invalidateBefore = user.invalidateSessionsBefore?.getTime() ?? 0
        token.lastCheckedAt = Date.now()
        token.rememberMe = user.rememberMe
        token.iat = Math.floor(Date.now() / 1000)
      }

      if (!token.rememberMe) {
        const tokenAge = Date.now() / 1000 - (token.iat ?? 0)

        if (tokenAge > sec('12 hours')) {
          return null
        }
      }

      if (token.id && Date.now() - (token.lastCheckedAt ?? 0) > ms('12 hours')) {
        const userData = await getUserWithRoles(token.id)

        if (!userData) {
          return null
        }

        const invalidateBefore = userData.invalidateSessionsBefore?.getTime() ?? 0

        if (invalidateBefore > (token.iat ?? 0) * 1000) {
          return null
        }

        token.roles = userData.roles
        token.invalidateBefore = invalidateBefore
        token.lastCheckedAt = Date.now()
      }

      return token
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      if (token.roles && session.user) {
        session.user.roles = token.roles
      }
      return session
    },
  },
})
