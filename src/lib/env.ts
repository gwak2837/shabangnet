import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    SUPABASE_CERTIFICATE: z.string().optional(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM_NAME: z.string().optional(),
    SMTP_FROM_EMAIL: z.email().optional(),
    // Auth
    AUTH_SECRET: z.string().min(1),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    AUTH_KAKAO_ID: z.string().optional(),
    AUTH_KAKAO_SECRET: z.string().optional(),
    AUTH_NAVER_ID: z.string().optional(),
    AUTH_NAVER_SECRET: z.string().optional(),
    // Test
    TEST_USER_EMAIL: z.email(),
    TEST_USER_PASSWORD: z.string(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_CERTIFICATE: process.env.SUPABASE_CERTIFICATE,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_KAKAO_ID: process.env.AUTH_KAKAO_ID,
    AUTH_KAKAO_SECRET: process.env.AUTH_KAKAO_SECRET,
    AUTH_NAVER_ID: process.env.AUTH_NAVER_ID,
    AUTH_NAVER_SECRET: process.env.AUTH_NAVER_SECRET,
    TEST_USER_EMAIL: process.env.TEST_USER_EMAIL,
    TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD,
  },
})
