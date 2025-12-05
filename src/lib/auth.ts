import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { twoFactor } from 'better-auth/plugins/two-factor'
import 'server-only'

import { getBaseURL } from '@/common/constants'
import { env } from '@/common/env'
import { db } from '@/db/client'
import { sec } from '@/utils/sec'

const baseURL = getBaseURL()
const hostname = new URL(baseURL).hostname

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  secret: env.AUTH_SECRET,
  baseURL,
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    apple: {
      clientId: env.AUTH_APPLE_ID || '',
      clientSecret: env.AUTH_APPLE_SECRET || '',
    },
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
      isAdmin: {
        type: 'boolean',
        defaultValue: false,
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
      trustedProviders: ['apple', 'google'],
    },
  },
  plugins: [
    nextCookies(),
    twoFactor({
      issuer: hostname,
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
      rpID: process.env.NODE_ENV === 'production' ? new URL(baseURL).hostname : 'localhost',
      rpName: hostname,
      origin: baseURL,
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
