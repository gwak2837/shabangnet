import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { twoFactor } from 'better-auth/plugins/two-factor'
import 'server-only'

import { getBaseURL, SITE_CONFIG } from '@/common/constants'
import { env } from '@/common/env'
import { db } from '@/db/client'

const baseURL = getBaseURL()
const hostname = new URL(baseURL).hostname

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  secret: env.AUTH_SECRET,
  baseURL,
  appName: SITE_CONFIG.name,
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
  session: { cookieCache: { enabled: true } },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['apple', 'google'],
    },
  },
  plugins: [
    nextCookies(),
    twoFactor(),
    passkey({
      rpID: process.env.NODE_ENV === 'production' ? hostname : 'localhost',
      rpName: SITE_CONFIG.name,
      origin: baseURL,
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
