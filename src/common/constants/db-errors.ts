export const PostgresErrorCodes = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
} as const

export type PostgresErrorCode = (typeof PostgresErrorCodes)[keyof typeof PostgresErrorCodes]

