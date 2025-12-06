'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { completeOnboarding } from '@/app/(auth)/actions'
import { authClient } from '@/lib/auth-client'

import { useSignOut } from '../useSignOut'
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
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [isPending, setIsPending] = useState(false)
  const { signOut, isSigningOut } = useSignOut()
  const [isCompletingOnboarding, startOnboardingCompletion] = useTransition()
  const [step, setStep] = useState(OnboardingStep.Step1_ChooseMethod)
  const [hasExistingPasskey, setHasExistingPasskey] = useState(false)
  const [totpURI, setTOTPURI] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const passwordFormRef = useRef<HTMLFormElement>(null)
  const totpFormRef = useRef<HTMLFormElement>(null)
  const userEmail = session?.user?.email || ''

  async function handleEnableTOTP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const password = String(formData.get('password'))
    setIsPending(true)

    const result = await authClient.twoFactor.enable({ password })

    if (result.error) {
      toast.error(result.error.message || 'TOTP 설정에 실패했어요')
      return
    }

    const data = result.data
    setTOTPURI(data.totpURI)
    setBackupCodes(data.backupCodes || [])
    setStep(OnboardingStep.Step3b_TOTPSetup)
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
            handleCompleteOnboarding()
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
          handleCompleteOnboarding()
        },
      },
    })

    setIsPending(false)
  }

  function handleCompleteOnboarding() {
    startOnboardingCompletion(async () => {
      const result = await completeOnboarding()

      if (result.success) {
        router.push('/pending-approval')
      } else {
        toast.error(result.error || '온보딩 완료 처리에 실패했어요')
      }
    })
  }

  function handleBack() {
    setStep(OnboardingStep.Step1_ChooseMethod)
    passwordFormRef.current?.reset()
    totpFormRef.current?.reset()
  }

  // NOTE: 패스키 존재 여부 및 소셜 유저 확인
  useEffect(() => {
    async function checkInitialState() {
      try {
        const passkeyResult = await authClient.passkey.listUserPasskeys()

        if (passkeyResult.data && passkeyResult.data.length > 0) {
          setHasExistingPasskey(true)
        }
      } catch {
        // 무시
      }
    }
    checkInitialState()
  }, [])

  switch (step) {
    case OnboardingStep.Step1_ChooseMethod:
      return (
        <Step1ChooseMethod
          hasExistingPasskey={hasExistingPasskey}
          isPending={isSigningOut || isSessionPending || isPending || isCompletingOnboarding}
          onComplete={handleCompleteOnboarding}
          onLogout={signOut}
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
      return <Step3aPasskeySetup isPending={isPending} onBack={handleBack} onSetup={handlePasskeySetup} />
    case OnboardingStep.Step3b_TOTPSetup:
      return (
        <Step3bTOTPSetup
          formRef={totpFormRef}
          isPending={isPending}
          onBack={handleBack}
          onSubmit={handleVerifyTOTP}
          totpUri={totpURI}
        />
      )
    case OnboardingStep.Step4_BackupCodes:
      return (
        <Step4BackupCodes
          backupCodes={backupCodes}
          isPending={isPending || isCompletingOnboarding}
          onComplete={handleCompleteOnboarding}
        />
      )
    default:
      return null
  }
}
