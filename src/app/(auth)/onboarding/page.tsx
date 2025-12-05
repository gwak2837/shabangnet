import { OnboardingFlow } from './onboarding-flow'

export default function OnboardingPage() {
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
