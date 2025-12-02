/**
 * 쿠키 키 상수
 *
 * 애플리케이션에서 사용하는 모든 쿠키 키를 중앙에서 관리합니다.
 * 키 변경 시 타입 안전하게 모든 사용처가 업데이트됩니다.
 */
export const COOKIE_KEYS = {
  /** MFA 대기 세션 (credentials 로그인 후 MFA 인증 전) */
  mfaSession: 'mfa_session',

  /** 온보딩 세션 (회원가입 완료 후 온보딩 전) */
  onboardingSession: 'onboarding_session',

  /** 신뢰 기기 지문 (MFA 건너뛰기) */
  trustedDevice: 'trusted_device',
} as const

export type CookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS]
