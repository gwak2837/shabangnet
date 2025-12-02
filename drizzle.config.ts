import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config({
  path: process.env.DB_ENV === 'production' ? '.env.production.local' : '.env.local',
  override: true,
})

console.log('👀 - SUPABASE_POSTGRES_URL_NON_POOLING:', process.env.SUPABASE_POSTGRES_URL_NON_POOLING)

export default defineConfig({
  schema: './src/db/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_POSTGRES_URL_NON_POOLING!,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  },
  strict: true,
})
