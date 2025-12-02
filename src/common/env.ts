import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    // Database
    SUPABASE_CERTIFICATE: z.string().optional(),
    SUPABASE_POSTGRES_URL_NON_POOLING: z.url(),

    // Authentication
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    AUTH_SECRET: z.string().min(1),

    // Email (SMTP)
    SMTP_HOST: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM_NAME: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  },
  runtimeEnv: {
    // Database
    SUPABASE_POSTGRES_URL_NON_POOLING: process.env.SUPABASE_POSTGRES_URL_NON_POOLING,
    SUPABASE_CERTIFICATE: process.env.SUPABASE_CERTIFICATE,

    // Authentication
    AUTH_SECRET: process.env.AUTH_SECRET,

    // OAuth - Google
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,

    // Email (SMTP)
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,

    // Client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
})
