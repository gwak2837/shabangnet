import { createEnv } from '@t3-oss/env-nextjs'
import 'server-only'
import { z } from 'zod'

export const env = createEnv({
  server: {
    AUTH_APPLE_ID: z.string().optional(),
    AUTH_APPLE_SECRET: z.string().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    AUTH_SECRET: z.string().min(1),
    SUPABASE_CERTIFICATE: z.string().optional(),
    SUPABASE_POSTGRES_URL: z.url(),
    SUPABASE_POSTGRES_URL_NON_POOLING: z.url(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  },
  runtimeEnv: {
    AUTH_APPLE_ID: process.env.AUTH_APPLE_ID,
    AUTH_APPLE_SECRET: process.env.AUTH_APPLE_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_CERTIFICATE: process.env.SUPABASE_CERTIFICATE,
    SUPABASE_POSTGRES_URL: process.env.SUPABASE_POSTGRES_URL,
    SUPABASE_POSTGRES_URL_NON_POOLING: process.env.SUPABASE_POSTGRES_URL_NON_POOLING,
  },
})
