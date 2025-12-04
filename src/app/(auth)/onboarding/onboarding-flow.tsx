'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { passkeyMethods, signOut, twoFactor, useSession } from '@/lib/auth-client'

import { OnboardingStep } from './common'
import { Step1ChooseMethod } from './step-1-choose-method'
import { Step2EnterPassword } from './step-2-enter-password'
import { Step3aPasskeySetup } from './step-3a-passkey-setup'
import { Step3bTOTPSetup } from './step-3b-totp-setup'
import { Step4BackupCodes } from './step-4-backup-codes'

/**
 * 온보딩 플로우
 * - 소셜 사용자: 패스키만 선택 가능 (better-auth 제약: 소셜 계정은 TOTP 불가)
 * - 비밀번호 사용자: TOTP(비밀번호 재입력 필요) 또는 패스키 선택 가능
 */
export function OnboardingFlow() {
  const router = useRouter()
  const { data: session, isPending: isSessionPending, refetch: refetchSession } = useSession()
  const [isPending, setIsPending] = useState(false)
  const [step, setStep] = useState(OnboardingStep.Step1_ChooseMethod)
  const [error, setError] = useState('')
  const [hasExistingPasskey, setHasExistingPasskey] = useState(false)
  const [totpUri, setTotpUri] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const passwordFormRef = useRef<HTMLFormElement>(null)
  const totpFormRef = useRef<HTMLFormElement>(null)
  const userEmail = session?.user?.email || ''
  const isSocialUser = session?.user?.authType === 'social'

  useEffect(() => {
    async function checkExistingPasskey() {
      try {
        const result = await passkeyMethods.listUserPasskeys()
        if (result.data && result.data.length > 0) {
          setHasExistingPasskey(true)
        }
      } catch {
        // 무시
      }
    }
    checkExistingPasskey()
  }, [])

  async function handleEnableTOTP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string

    try {
      const result = await twoFactor.enable({ password })

      if (result.error) {
        setError(result.error.message || 'TOTP 설정에 실패했어요')
        return
      }

      // TOTP 활성화 후 세션 새로고침 (twoFactorEnabled가 업데이트됨)
      await refetchSession()

      const data = result.data
      if (data.totpURI) {
        setTotpUri(data.totpURI)
        if (data.backupCodes) {
          setBackupCodes(data.backupCodes)
        }
        setStep(OnboardingStep.Step3b_TOTPSetup)
      }
    } catch {
      setError('TOTP 설정 중 오류가 발생했어요')
    } finally {
      setIsPending(false)
    }
  }

  async function handleVerifyTOTP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const code = formData.get('totpCode') as string

    try {
      const result = await twoFactor.verifyTotp({ code })

      if (result.error) {
        setError(result.error.message || '인증 코드가 올바르지 않아요')
        return
      }

      if (backupCodes.length > 0) {
        setStep(OnboardingStep.Step4_BackupCodes)
      } else {
        completeOnboarding()
      }
    } catch {
      setError('인증 중 오류가 발생했어요')
    } finally {
      setIsPending(false)
    }
  }

  async function handlePasskeySetup() {
    setError('')
    setIsPending(true)

    try {
      const result = await passkeyMethods.addPasskey({ name: userEmail })

      if (result.error) {
        setError(result.error.message || '패스키 등록에 실패했어요')
        return
      }

      completeOnboarding()
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('패스키 등록이 취소되었습니다.')
      } else {
        setError('패스키 등록에 실패했어요')
      }
    } finally {
      setIsPending(false)
    }
  }

  async function completeOnboarding() {
    setIsPending(true)

    try {
      const response = await fetch('/api/auth/complete-onboarding', { method: 'POST' })

      if (response.ok) {
        router.push('/pending-approval')
      } else {
        setError('온보딩 완료 처리에 실패했어요')
      }
    } catch {
      setError('온보딩 완료 처리에 실패했어요')
    } finally {
      setIsPending(false)
    }
  }

  function handleBack() {
    setStep(OnboardingStep.Step1_ChooseMethod)
    passwordFormRef.current?.reset()
    totpFormRef.current?.reset()
    setError('')
  }

  async function handleLogout() {
    await signOut()
    window.location.href = '/login'
  }

  if (isSessionPending) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  switch (step) {
    case OnboardingStep.Step1_ChooseMethod:
      return (
        <Step1ChooseMethod
          error={error}
          hasExistingPasskey={hasExistingPasskey}
          isPending={isPending}
          isSocialUser={isSocialUser}
          onComplete={completeOnboarding}
          onLogout={handleLogout}
          onSelectPasskey={() => setStep(OnboardingStep.Step3a_PasskeySetup)}
          onSelectTOTP={() => setStep(OnboardingStep.Step2_EnterPassword)}
        />
      )
    case OnboardingStep.Step2_EnterPassword:
      return (
        <Step2EnterPassword
          error={error}
          formRef={passwordFormRef}
          isPending={isPending}
          onBack={handleBack}
          onSubmit={handleEnableTOTP}
        />
      )
    case OnboardingStep.Step3a_PasskeySetup:
      return (
        <Step3aPasskeySetup
          error={error}
          isPending={isPending}
          isSocialUser={isSocialUser}
          onBack={handleBack}
          onSetup={handlePasskeySetup}
        />
      )
    case OnboardingStep.Step3b_TOTPSetup:
      return (
        <Step3bTOTPSetup
          error={error}
          formRef={totpFormRef}
          isPending={isPending}
          onBack={handleBack}
          onSubmit={handleVerifyTOTP}
          totpUri={totpUri}
        />
      )
    case OnboardingStep.Step4_BackupCodes:
      return (
        <Step4BackupCodes
          backupCodes={backupCodes}
          error={error}
          isPending={isPending}
          onComplete={completeOnboarding}
        />
      )
    default:
      return null
  }
}
