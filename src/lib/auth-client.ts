'use client'

import { passkeyClient } from '@better-auth/passkey/client'
import { inferAdditionalFields, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import { getBaseURL } from '@/common/constants'

import type { auth } from './auth'

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [twoFactorClient(), passkeyClient(), inferAdditionalFields<typeof auth>()],
})
