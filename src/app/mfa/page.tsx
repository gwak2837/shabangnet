import { redirect } from 'next/navigation'

import { auth } from '@/auth'

import { MfaChallenge } from './mfa-challenge'

export default async function MfaPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const mfaRequired = session.mfaRequired
  const mfaSteps = session.mfaSteps
  const isAdmin = session.user.roles?.includes('admin') ?? false

  // MFA가 이미 완료된 경우
  if (checkMfaComplete(mfaRequired, mfaSteps, isAdmin)) {
    redirect('/dashboard')
  }

  return (
    <>
      <div className="text-center">
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">추가 인증 필요</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAdmin && mfaRequired?.totp && mfaRequired?.passkey
            ? '관리자 계정은 등록된 모든 MFA를 완료해야 합니다.'
            : '보안을 위해 추가 인증을 완료해주세요.'}
        </p>
      </div>
      <MfaChallenge
        isAdmin={isAdmin}
        mfaRequired={mfaRequired ?? { totp: false, passkey: false }}
        mfaSteps={mfaSteps ?? { primary: true, totp: false, passkey: false }}
      />
    </>
  )
}

/**
 * MFA 완료 여부를 확인합니다.
 * - 관리자: 등록된 모든 MFA 방식을 완료해야 함
 * - 일반 사용자: 등록된 MFA 중 하나만 완료하면 됨
 */
function checkMfaComplete(
  mfaRequired: { passkey: boolean; totp: boolean } | undefined,
  mfaSteps: { passkey: boolean; primary: boolean; totp: boolean } | undefined,
  isAdmin: boolean,
): boolean {
  if (!mfaRequired || (!mfaRequired.totp && !mfaRequired.passkey)) {
    return true
  }

  const totpComplete = !mfaRequired.totp || mfaSteps?.totp
  const passkeyComplete = !mfaRequired.passkey || mfaSteps?.passkey

  if (isAdmin) {
    // 관리자: 등록된 모든 MFA 완료 필요
    return !!totpComplete && !!passkeyComplete
  } else {
    // 일반 사용자: 등록된 MFA 중 하나만 완료하면 됨
    const needsMfa = mfaRequired.totp || mfaRequired.passkey
    if (!needsMfa) return true
    return !!mfaSteps?.totp || !!mfaSteps?.passkey
  }
}
