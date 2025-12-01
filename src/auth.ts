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

import { getUserRoles, getUserWithRoles, processLoginAttempt } from '@/auth.query'
import { env } from '@/common/env'
import { db } from '@/db/client'
import { users } from '@/db/schema/auth'
import { getUserMfaSettings } from '@/lib/mfa'

import { sec } from './utils/sec'

const apiAuthPrefix = '/api/auth'
const DEFAULT_LOGIN_REDIRECT = '/dashboard'
const MFA_CHALLENGE_ROUTE = '/mfa'
const publicRoutes = ['']
const authRoutes = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/unlock-account']
const mfaRoutes = ['/mfa']

interface MfaRequired {
  passkey: boolean
  totp: boolean
}

interface MfaSteps {
  passkey: boolean
  primary: boolean
  totp: boolean
}

class AccountLockedError extends CredentialsSignin {
  code = 'account_locked'
}

class TooManyAttemptsError extends CredentialsSignin {
  code = 'too_many_attempts'
}

/**
 * MFA 완료 여부를 확인합니다.
 * - 관리자: 등록된 모든 MFA 방식을 완료해야 함
 * - 일반 사용자: 등록된 MFA 중 하나만 완료하면 됨
 */
function checkMfaComplete(
  mfaRequired: MfaRequired | undefined,
  mfaSteps: MfaSteps | undefined,
  isAdmin: boolean | undefined,
): boolean {
  // MFA가 설정되지 않은 경우 완료로 간주
  if (!mfaRequired || (!mfaRequired.totp && !mfaRequired.passkey)) {
    return true
  }

  const totpComplete = !mfaRequired.totp || mfaSteps?.totp
  const passkeyComplete = !mfaRequired.passkey || mfaSteps?.passkey

  if (isAdmin) {
    // 관리자: 등록된 모든 MFA 완료 필요
    return !!totpComplete && !!passkeyComplete
  } else {
    // 일반 사용자: 등록된 MFA 중 하나만 완료하면 됨
    // MFA가 필요하면 하나라도 완료해야 함
    const needsMfa = mfaRequired.totp || mfaRequired.passkey
    if (!needsMfa) return true
    return !!mfaSteps?.totp || !!mfaSteps?.passkey
  }
}

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
  rememberMe: z.string().optional(),
})

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
      const isMfaRoute = mfaRoutes.includes(nextUrl.pathname)
      const isMfaApiRoute = nextUrl.pathname.startsWith('/api/mfa')

      if (isApiAuthRoute || isMfaApiRoute) {
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

      // MFA 완료 여부 확인
      if (isLoggedIn && !isMfaRoute) {
        const mfaSteps = auth?.mfaSteps
        const mfaRequired = auth?.mfaRequired
        const isAdmin = auth?.user?.roles?.includes('admin')

        const mfaComplete = checkMfaComplete(mfaRequired, mfaSteps, isAdmin)
        if (!mfaComplete) {
          return Response.redirect(new URL(MFA_CHALLENGE_ROUTE, nextUrl))
        }
      }

      // MFA 페이지 접근 시 MFA가 이미 완료되었으면 대시보드로 리다이렉트
      if (isLoggedIn && isMfaRoute) {
        const mfaSteps = auth?.mfaSteps
        const mfaRequired = auth?.mfaRequired
        const isAdmin = auth?.user?.roles?.includes('admin')

        const mfaComplete = checkMfaComplete(mfaRequired, mfaSteps, isAdmin)
        if (mfaComplete) {
          return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
        }
      }

      return true
    },
    async jwt({ token, user, account, trigger, session: updateData }) {
      if (user) {
        token.id = user.id
        token.roles = await getUserRoles(user.id!)
        token.invalidateBefore = user.invalidateSessionsBefore?.getTime() ?? 0
        token.lastCheckedAt = Date.now()
        token.rememberMe = user.rememberMe
        token.iat = Math.floor(Date.now() / 1000)
        token.exp = token.iat + (token.rememberMe ? sec('30d') : sec('12h'))

        // MFA 상태 초기화
        const mfaSettings = await getUserMfaSettings(user.id!)

        // 1차 인증 방법 결정
        const primaryMethod = account?.provider === 'credentials' ? 'password' : 'social'
        token.primaryAuthMethod = primaryMethod

        // 모든 사용자: 설정된 MFA 방식에 따라 (관리자도 선택 가능)
        token.mfaRequired = {
          totp: mfaSettings.totpEnabled,
          passkey: mfaSettings.passkeyEnabled,
        }
        token.mfaSteps = {
          primary: true,
          totp: false,
          passkey: false,
        }
      }

      // MFA 단계 업데이트 (trigger가 'update'인 경우)
      if (trigger === 'update' && updateData?.mfaSteps) {
        token.mfaSteps = {
          ...token.mfaSteps,
          ...updateData.mfaSteps,
        }
        return token
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
      // MFA 상태 세션에 추가
      session.mfaSteps = token.mfaSteps
      session.mfaRequired = token.mfaRequired
      session.primaryAuthMethod = token.primaryAuthMethod
      return session
    },
  },
})
