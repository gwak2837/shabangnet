import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

function getLocalEnvPath() {
  if (process.env.DB_ENV === 'production') {
    return '.env.production.local'
  }
  if (process.env.DB_ENV === 'test') {
    return '.env.test.local'
  }
  return '.env.local'
}

dotenv.config({
  path: getLocalEnvPath(),
  override: true,
  quiet: true,
})

console.log(`👀 - DB_ENV: ${process.env.DB_ENV || 'development'}`)
console.log(`👀 - SUPABASE_POSTGRES_URL_NON_POOLING: ${process.env.SUPABASE_POSTGRES_URL_NON_POOLING}`)

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_POSTGRES_URL_NON_POOLING!,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  },
  strict: true,
})
