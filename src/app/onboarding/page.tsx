import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'

import { OnboardingFlow } from './onboarding-flow'

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { onboardingComplete?: boolean; status?: string }

  // 이미 온보딩이 완료된 경우
  if (user.onboardingComplete) {
    if (user.status === 'pending') {
      redirect('/pending-approval')
    }
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md flex flex-col gap-8 rounded-xl bg-card p-8 shadow-lg border border-border">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">보안 설정</h1>
          <p className="mt-2 text-sm text-muted-foreground">계정 보안을 위해 2차 인증을 설정해주세요</p>
        </div>
        <OnboardingFlow />
      </div>
    </div>
  )
}
