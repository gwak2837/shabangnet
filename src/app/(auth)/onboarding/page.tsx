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
    <>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">계정을 보호하세요</h1>
        <p className="mt-2 text-sm text-muted-foreground">2단계 인증으로 더 안전하게 사용할 수 있어요</p>
      </div>
      <OnboardingFlow />
    </>
  )
}

