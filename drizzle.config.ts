import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config({ path: process.env.DB_ENV === 'production' ? '.env.production' : '.env.local' })

console.log('👀 - DATABASE_URL:', process.env.DATABASE_URL)

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  },
  strict: true,
})
