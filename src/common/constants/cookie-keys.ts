export const COOKIE_KEYS = {
  mfaSession: 'mfa_session',
  onboardingSession: 'onboarding_session',
  trustedDevice: 'trusted_device',
} as const

export type CookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS]
