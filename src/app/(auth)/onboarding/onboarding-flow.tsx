'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { signOut } from '@/app/(auth)/actions'
import { authClient } from '@/lib/auth-client'

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
  const { data: session, isPending: isSessionPending, refetch: refetchSession } = authClient.useSession()
  const [isPending, setIsPending] = useState(false)
  const [isLoggingOut, startLogout] = useTransition()
  const [step, setStep] = useState(OnboardingStep.Step1_ChooseMethod)
  const [hasExistingPasskey, setHasExistingPasskey] = useState(false)
  const [totpUri, setTotpUri] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const passwordFormRef = useRef<HTMLFormElement>(null)
  const totpFormRef = useRef<HTMLFormElement>(null)
  const userEmail = session?.user?.email || ''
  const isSocialUser = session?.user?.authType === 'social'

  async function handleEnableTOTP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const password = String(formData.get('password'))

    await authClient.twoFactor.enable({
      password,
      fetchOptions: {
        onError: (ctx) => {
          toast.error(ctx.error.message || 'TOTP 설정에 실패했어요')
        },
        onSuccess: async (ctx) => {
          const data = ctx.data as { totpURI?: string; backupCodes?: string[] }
          if (data.totpURI) {
            await refetchSession()
            setTotpUri(data.totpURI)
            setBackupCodes(data.backupCodes || [])
            setStep(OnboardingStep.Step3b_TOTPSetup)
          }
        },
      },
    })

    setIsPending(false)
  }

  async function handleVerifyTOTP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const code = String(formData.get('totpCode'))
    setIsPending(true)

    await authClient.twoFactor.verifyTotp({
      code,
      fetchOptions: {
        onError: (ctx) => {
          toast.error(ctx.error.message || '인증 코드가 올바르지 않아요')
        },
        onSuccess: () => {
          if (backupCodes.length > 0) {
            setStep(OnboardingStep.Step4_BackupCodes)
          } else {
            completeOnboarding()
          }
        },
      },
    })

    setIsPending(false)
  }

  async function handlePasskeySetup() {
    setIsPending(true)

    await authClient.passkey.addPasskey({
      name: userEmail,

      fetchOptions: {
        onError: (ctx) => {
          toast.error(ctx.error.message || '패스키 등록에 실패했어요')
        },
        onSuccess: () => {
          completeOnboarding()
        },
      },
    })

    setIsPending(false)
  }

  async function completeOnboarding() {
    setIsPending(true)

    try {
      const response = await fetch('/api/auth/complete-onboarding', { method: 'POST' })

      if (response.ok) {
        router.push('/pending-approval')
      } else {
        toast.error('온보딩 완료 처리에 실패했어요')
      }
    } catch {
      toast.error('온보딩 완료 처리에 실패했어요')
    } finally {
      setIsPending(false)
    }
  }

  function handleBack() {
    setStep(OnboardingStep.Step1_ChooseMethod)
    passwordFormRef.current?.reset()
    totpFormRef.current?.reset()
  }

  function handleLogout() {
    startLogout(async () => {
      await signOut()
      window.location.href = '/login'
    })
  }

  // NOTE: 패스키 존재 여부 확인
  useEffect(() => {
    async function checkExistingPasskey() {
      try {
        const result = await authClient.passkey.listUserPasskeys()
        if (result.data && result.data.length > 0) {
          setHasExistingPasskey(true)
        }
      } catch {
        // 무시
      }
    }
    checkExistingPasskey()
  }, [])

  switch (step) {
    case OnboardingStep.Step1_ChooseMethod:
      return (
        <Step1ChooseMethod
          hasExistingPasskey={hasExistingPasskey}
          isPending={isLoggingOut || isSessionPending || isPending}
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
          formRef={passwordFormRef}
          isPending={isPending}
          onBack={handleBack}
          onSubmit={handleEnableTOTP}
        />
      )
    case OnboardingStep.Step3a_PasskeySetup:
      return (
        <Step3aPasskeySetup
          isPending={isPending}
          isSocialUser={isSocialUser}
          onBack={handleBack}
          onSetup={handlePasskeySetup}
        />
      )
    case OnboardingStep.Step3b_TOTPSetup:
      return (
        <Step3bTOTPSetup
          formRef={totpFormRef}
          isPending={isPending}
          onBack={handleBack}
          onSubmit={handleVerifyTOTP}
          totpUri={totpUri}
        />
      )
    case OnboardingStep.Step4_BackupCodes:
      return <Step4BackupCodes backupCodes={backupCodes} isPending={isPending} onComplete={completeOnboarding} />
    default:
      return null
  }
}
