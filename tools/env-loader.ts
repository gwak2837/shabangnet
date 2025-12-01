/**
 * Environment loader for CLI tools
 * This file MUST be imported first in any tool script
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
