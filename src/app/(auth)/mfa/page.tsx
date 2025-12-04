import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'

import { MfaChallenge } from './mfa-challenge'

export default async function MfaPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // 세션이 없으면 로그인으로
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { twoFactorEnabled?: boolean; status?: string; onboardingComplete?: boolean }

  // 2FA가 활성화되지 않았거나 이미 검증됐으면 대시보드로
  if (!user.twoFactorEnabled) {
    if (!user.onboardingComplete) {
      redirect('/onboarding')
    }
    if (user.status === 'pending') {
      redirect('/pending-approval')
    }
    redirect('/dashboard')
  }

  return (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">본인 확인</h2>
        <p className="mt-2 text-sm text-muted-foreground">안전한 로그인을 위해 인증을 완료해주세요</p>
      </div>
      <MfaChallenge />
    </>
  )
}

