import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import 'server-only'

import { env } from '@/common/env'

import * as authSchema from './schema/auth'
import * as manufacturersSchema from './schema/manufacturers'
import * as ordersSchema from './schema/orders'
import * as relationsSchema from './schema/relations'
import * as settingsSchema from './schema/settings'

const schema = {
  ...authSchema,
  ...manufacturersSchema,
  ...ordersSchema,
  ...relationsSchema,
  ...settingsSchema,
}

const client = postgres(env.SUPABASE_POSTGRES_URL, {
  prepare: false,
  ssl: env.SUPABASE_CERTIFICATE ? { ca: env.SUPABASE_CERTIFICATE, rejectUnauthorized: true } : 'prefer',
})

export const db = drizzle({ client, schema })

export type Database = typeof db
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
