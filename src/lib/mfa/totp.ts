import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

// TOTP 설정
const TOTP_CONFIG = {
  issuer: '다온 OMS',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
} as const

/**
 * TOTP 객체를 생성합니다.
 */
export function createTotp(email: string, secret: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: TOTP_CONFIG.issuer,
    label: email,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
}

/**
 * 현재 TOTP 코드를 생성합니다 (테스트/디버깅용).
 */
export function generateCurrentTotpToken(secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_CONFIG.issuer,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  return totp.generate()
}

/**
 * TOTP QR 코드를 생성합니다.
 * @returns Base64 인코딩된 PNG 이미지
 */
export async function generateTotpQrCode(email: string, secret: string): Promise<string> {
  const uri = generateTotpUri(email, secret)
  return QRCode.toDataURL(uri, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}

/**
 * 새로운 TOTP secret을 생성합니다.
 */
export function generateTotpSecret(): string {
  // 20바이트 (160비트) secret 생성
  const secret = new OTPAuth.Secret({ size: 20 })
  return secret.base32
}

/**
 * TOTP URI를 생성합니다 (QR 코드용).
 */
export function generateTotpUri(email: string, secret: string): string {
  const totp = createTotp(email, secret)
  return totp.toString()
}

/**
 * TOTP 코드를 검증합니다.
 * @param secret Base32 인코딩된 secret
 * @param token 사용자가 입력한 6자리 코드
 * @param window 허용할 시간 윈도우 (기본값: 1 = ±30초)
 */
export function verifyTotpToken(secret: string, token: string, window = 1): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_CONFIG.issuer,
      algorithm: TOTP_CONFIG.algorithm,
      digits: TOTP_CONFIG.digits,
      period: TOTP_CONFIG.period,
      secret: OTPAuth.Secret.fromBase32(secret),
    })

    // delta는 허용된 시간 윈도우 내에서 토큰이 유효한지 확인
    // null이 아니면 유효
    const delta = totp.validate({ token, window })
    return delta !== null
  } catch {
    return false
  }
}
