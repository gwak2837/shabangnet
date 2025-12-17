import 'server-only'
import { z } from 'zod'

export function decodeCursor<T>(cursor: string, schema: z.ZodType<T>): T {
  const json = Buffer.from(cursor, 'base64url').toString('utf8')
  const parsed = JSON.parse(json) as unknown
  return schema.parse(parsed)
}

export function encodeCursor<T extends Record<string, unknown>>(payload: T): string {
  const json = JSON.stringify(payload)
  return Buffer.from(json, 'utf8').toString('base64url')
}
