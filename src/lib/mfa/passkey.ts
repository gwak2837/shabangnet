import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'

// WebAuthn 설정
const RP_NAME = '다온 OMS'
const RP_ID = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : 'localhost'
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export interface PasskeyCredentialData {
  backedUp?: boolean
  counter: number
  deviceType?: string
  id: string
  publicKey: string
  transports?: string
}

/**
 * 패스키 인증 옵션을 생성합니다.
 */
export async function createAuthenticationOptions(
  credentials: { id: string; transports?: string }[] = [],
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const allowCredentials = credentials.map((cred) => ({
    id: cred.id,
    transports: cred.transports ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[]) : undefined,
  }))

  return generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred',
    timeout: 60000, // 60초
  })
}

/**
 * 패스키 등록 옵션을 생성합니다.
 */
export async function createRegistrationOptions(
  userId: string,
  userEmail: string,
  userName: string | null,
  existingCredentials: { id: string; transports?: string }[] = [],
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  // 기존 패스키들을 제외 목록에 추가
  const excludeCredentials = existingCredentials.map((cred) => ({
    id: cred.id,
    transports: cred.transports ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[]) : undefined,
  }))

  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userName || userEmail,
    attestationType: 'none', // 증명 불필요
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform', // 플랫폼 인증기 우선
    },
    timeout: 60000, // 60초
  })
}

/**
 * credential ID를 base64url로 인코딩합니다.
 */
export function encodeCredentialId(credentialId: Uint8Array): string {
  return Buffer.from(credentialId).toString('base64url')
}

/**
 * 공개키를 base64url로 인코딩합니다.
 */
export function encodePublicKey(publicKey: Uint8Array): string {
  return Buffer.from(publicKey).toString('base64url')
}

/**
 * 패스키 인증 응답을 검증합니다.
 */
export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: {
    id: string
    publicKey: string
    counter: number
  },
): Promise<VerifiedAuthenticationResponse> {
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey, 'base64url'),
      counter: credential.counter,
    },
    requireUserVerification: true,
  })
}

/**
 * 패스키 등록 응답을 검증합니다.
 */
export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
): Promise<VerifiedRegistrationResponse> {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  })
}
