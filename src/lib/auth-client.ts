'use client'

import { passkeyClient } from '@better-auth/passkey/client'
import { inferAdditionalFields, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import type { auth } from './auth'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  plugins: [twoFactorClient(), passkeyClient(), inferAdditionalFields<typeof auth>()],
})

// Export commonly used hooks and functions
export const { getSession, signIn, signOut, signUp, useSession } = authClient

// Two-factor methods
export const twoFactor = authClient.twoFactor

// Passkey methods
export const passkeyMethods = authClient.passkey
