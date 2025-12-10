import { config } from 'dotenv'
import Module from 'module'
import { resolve } from 'path'

const envFile =
  process.env.DB_ENV === 'test'
    ? '.env.test.local'
    : process.env.DB_ENV === 'production'
      ? '.env.production.local'
      : '.env.local'

config({ path: resolve(process.cwd(), envFile), quiet: true })

const originalRequire = Module.prototype.require

Module.prototype.require = function (this, id: string) {
  // Mock 'server-only' module for CLI environment
  if (id === 'server-only') {
    return {}
  }
  return originalRequire.call(this, id)
}
