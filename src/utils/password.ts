// 허용되는 특수문자 목록
export const SPECIAL_CHARACTERS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

// 비밀번호 검증 규칙
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireLetter: true,
  requireNumber: true,
  requireSpecial: true,
} as const

// 비밀번호 강도 타입
export type PasswordStrength = 'medium' | 'strong' | 'weak'

// 개별 검증 결과 타입
export interface PasswordValidationResult {
  errors: {
    minLength: boolean
    maxLength: boolean
    hasLetter: boolean
    hasNumber: boolean
    hasSpecial: boolean
    isCommon: boolean
  }
  isValid: boolean
}

// 정규식 패턴
const LETTER_REGEX = /[a-zA-Z]/
const NUMBER_REGEX = /\d/
const SPECIAL_REGEX = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/

/**
 * 비밀번호 강도 계산
 */
export function calculateStrength(password: string): PasswordStrength {
  if (!password) return 'weak'

  let score = 0

  // 길이 점수
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1

  // 문자 종류 점수
  if (LETTER_REGEX.test(password)) score += 1
  if (NUMBER_REGEX.test(password)) score += 1
  if (SPECIAL_REGEX.test(password)) score += 1

  // 대소문자 혼합 점수
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1

  // 강도 판정
  if (score <= 3) return 'weak'
  if (score <= 5) return 'medium'
  return 'strong'
}

/**
 * 강도별 한글 레이블
 */
export function getStrengthLabel(strength: PasswordStrength): string {
  const labels: Record<PasswordStrength, string> = {
    weak: '약함',
    medium: '보통',
    strong: '강함',
  }
  return labels[strength]
}

/**
 * 개별 규칙별 비밀번호 검증 (클라이언트 blur 피드백용)
 */
export function validatePassword(password: string, commonPasswords?: Set<string>): PasswordValidationResult {
  const errors = {
    minLength: password.length < PASSWORD_RULES.minLength,
    maxLength: password.length > PASSWORD_RULES.maxLength,
    hasLetter: !LETTER_REGEX.test(password),
    hasNumber: !NUMBER_REGEX.test(password),
    hasSpecial: !SPECIAL_REGEX.test(password),
    isCommon: commonPasswords ? commonPasswords.has(password.toLowerCase()) : false,
  }

  const isValid = !Object.values(errors).some(Boolean)

  return { isValid, errors }
}

/**
 * 검증 에러 메시지 (한글)
 */
export const PASSWORD_ERROR_MESSAGES = {
  minLength: `최소 ${PASSWORD_RULES.minLength}자 이상이어야 해요`,
  maxLength: `최대 ${PASSWORD_RULES.maxLength}자까지 가능해요`,
  hasLetter: '알파벳을 포함해주세요',
  hasNumber: '숫자를 포함해주세요',
  hasSpecial: '특수문자를 포함해주세요 (!@#$%^&* 등)',
  isCommon: '너무 흔한 비밀번호예요. 다른 비밀번호를 선택해주세요',
  mismatch: '비밀번호가 일치하지 않아요',
} as const
