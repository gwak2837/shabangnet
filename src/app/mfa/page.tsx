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
    <div className="flex min-h-screen items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md flex flex-col gap-8 rounded-xl bg-card p-8 shadow-lg border border-border">
        <div className="text-center">
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">추가 인증 필요</h2>
          <p className="mt-2 text-sm text-muted-foreground">보안을 위해 추가 인증을 완료해주세요.</p>
        </div>
        <MfaChallenge />
      </div>
    </div>
  )
}
