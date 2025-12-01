import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/common/env'

import * as schema from './schema'

// postgres.js 클라이언트 생성
// max: 1 은 서버리스 환경에서 권장 (Next.js API Routes)
const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: env.SUPABASE_CERTIFICATE ? { ca: env.SUPABASE_CERTIFICATE, rejectUnauthorized: true } : 'prefer',
})

// Drizzle ORM 인스턴스 생성
export const db = drizzle(client, { schema })

// 타입 export
export type Database = typeof db
