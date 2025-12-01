import { DefaultSession } from 'next-auth'
import 'next-auth/jwt'

// MFA 필요 여부
interface MfaRequired {
  passkey: boolean
  totp: boolean
}

// MFA 단계 상태
interface MfaSteps {
  passkey: boolean // 패스키 인증 완료 (MFA 단계로서)
  primary: boolean // 1차 인증 완료 (비밀번호/소셜/패스키)
  totp: boolean // TOTP 인증 완료
}

declare module 'next-auth' {
  interface Session {
    mfaRequired?: MfaRequired
    mfaSteps?: MfaSteps
    primaryAuthMethod?: 'passkey' | 'password' | 'social'
    user: DefaultSession['user'] & {
      roles: string[]
      id: string
    }
  }

  interface User {
    invalidateSessionsBefore?: Date | null
    passkeyEnabled?: boolean
    rememberMe?: boolean
    totpEnabled?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    iat?: number
    id?: string
    invalidateBefore?: number
    lastCheckedAt?: number
    mfaRequired?: MfaRequired
    // MFA 관련 필드
    mfaSteps?: MfaSteps
    primaryAuthMethod?: 'passkey' | 'password' | 'social'
    rememberMe?: boolean
    roles?: string[]
  }
}
