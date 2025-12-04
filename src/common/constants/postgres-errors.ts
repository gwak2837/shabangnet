export const PostgresErrorCodes = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
} as const

export type PostgresErrorCode = (typeof PostgresErrorCodes)[keyof typeof PostgresErrorCodes]

/**
 * 에러에서 PostgreSQL 에러 코드 추출
 * Drizzle ORM은 에러를 cause 안에 PostgresError로 감싸서 전달
 */
export function getPostgresErrorCode(error: unknown): string | null {
  if (!(error instanceof Error)) {
    return null
  }

  // Drizzle: error.cause에 PostgresError가 있음
  if ('cause' in error && error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
    return error.cause.code as string
  }

  // 직접 code가 있는 경우
  if ('code' in error) {
    return error.code as string
  }

  return null
}

/**
 * 중복 키 에러인지 확인
 */
export function isUniqueViolation(error: unknown): boolean {
  return getPostgresErrorCode(error) === PostgresErrorCodes.UNIQUE_VIOLATION
}
