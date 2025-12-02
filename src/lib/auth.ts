import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { twoFactor } from 'better-auth/plugins/two-factor'

import { env } from '@/common/env'
import { db } from '@/db/client'
import * as schema from '@/db/schema/auth'
import { sec } from '@/utils/sec'

const baseURL = env.BETTER_AUTH_URL || 'http://localhost:3000'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      passkey: schema.passkey,
    },
  }),
  secret: env.AUTH_SECRET,
  baseURL,
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // TODO: 이메일 전송 구현
      console.log(`Password reset email for ${user.email}: ${url}`)
    },
  },
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID || '',
      clientSecret: env.AUTH_GOOGLE_SECRET || '',
    },
  },
  user: {
    additionalFields: {
      status: {
        type: 'string',
        defaultValue: 'pending',
        input: false,
      },
      onboardingComplete: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
      authType: {
        type: 'string',
        defaultValue: 'password',
        input: false,
      },
    },
  },
  session: {
    expiresIn: sec('7 days'),
    updateAge: sec('1 day'),
    cookieCache: {
      enabled: true,
      maxAge: sec('5 minutes'),
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  plugins: [
    twoFactor({
      issuer: 'daonfnc',
      totpOptions: {
        digits: 6,
        period: 30,
      },
      backupCodeOptions: {
        length: 10,
        amount: 10,
      },
    }),
    passkey({
      rpID: process.env.NODE_ENV === 'production' ? 'daonfnc.vercel.app' : 'localhost',
      rpName: 'daonfnc',
      origin: baseURL,
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
