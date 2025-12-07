import { config } from 'dotenv'
import Module from 'module'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const originalRequire = Module.prototype.require

Module.prototype.require = function (this, id: string) {
  // Mock 'server-only' module for CLI environment
  if (id === 'server-only') {
    return {}
  }
  return originalRequire.call(this, id)
}
