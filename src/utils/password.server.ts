import 'server-only'
import { z } from 'zod'

import { PASSWORD_ERROR_MESSAGES, PASSWORD_RULES } from './password'

// 정규식 패턴
const LETTER_REGEX = /[a-zA-Z]/
const NUMBER_REGEX = /\d/
const SPECIAL_REGEX = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/

/**
 * Zod 비밀번호 스키마 (기본 검증)
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.minLength, PASSWORD_ERROR_MESSAGES.minLength)
  .max(PASSWORD_RULES.maxLength, PASSWORD_ERROR_MESSAGES.maxLength)
  .regex(LETTER_REGEX, PASSWORD_ERROR_MESSAGES.hasLetter)
  .regex(NUMBER_REGEX, PASSWORD_ERROR_MESSAGES.hasNumber)
  .regex(SPECIAL_REGEX, PASSWORD_ERROR_MESSAGES.hasSpecial)

/**
 * 흔한 비밀번호 체크를 포함한 커스텀 검증 함수
 */
export function createPasswordSchemaWithCommonCheck(commonPasswords: Set<string>) {
  return passwordSchema.refine((password) => !commonPasswords.has(password.toLowerCase()), {
    message: PASSWORD_ERROR_MESSAGES.isCommon,
  })
}



