'use client'

import { startAuthentication } from '@simplewebauthn/browser'
import { Fingerprint, KeyRound, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { getPasskeyAuthenticationOptions, type LoginResult, loginWithPasskey, loginWithPassword } from './actions'

enum LoginStep {
  Step1_Email,
  Step2_Credentials,
}

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState(LoginStep.Step1_Email)
  const [email, setEmail] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleLoginResult(result: LoginResult) {
    if (result.error) {
      setError(result.error)
      return
    }

    if (result.requiresMfa) {
      router.push('/mfa')
      return
    }

    if (result.requiresOnboarding) {
      router.push('/onboarding')
      return
    }

    if (result.success) {
      router.push('/dashboard')
    }
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email.trim()) {
      return
    }

    setError('')
    setStep(LoginStep.Step2_Credentials)
  }

  function handlePasskeyLogin() {
    setError('')

    startTransition(async () => {
      try {
        const optionsResult = await getPasskeyAuthenticationOptions(email)

        if (!optionsResult.success || !optionsResult.options || !optionsResult.challengeId) {
          setError('패스키 인증에 실패했어요')
          return
        }

        const authResponse = await startAuthentication({ optionsJSON: optionsResult.options })
        const result = await loginWithPasskey(optionsResult.challengeId, authResponse)
        handleLoginResult(result)
      } catch (err) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setError('패스키 인증이 취소됐어요')
        } else {
          setError('패스키 인증에 실패했어요')
        }
      }
    })
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string

    startTransition(async () => {
      const result = await loginWithPassword(email, password, rememberMe)
      handleLoginResult(result)
    })
  }

  function handleBack() {
    setStep(LoginStep.Step1_Email)
    setError('')
  }

  // NOTE: Conditional UI
  useEffect(() => {
    async function initConditionalAuth() {
      if (!window.PublicKeyCredential?.isConditionalMediationAvailable) {
        return
      }

      try {
        const isAvailable = await window.PublicKeyCredential.isConditionalMediationAvailable()

        if (!isAvailable) {
          return
        }

        const optionsResult = await getPasskeyAuthenticationOptions()

        if (!optionsResult.success || !optionsResult.options || !optionsResult.challengeId) {
          return
        }

        const authResponse = await startAuthentication({
          optionsJSON: optionsResult.options,
          useBrowserAutofill: true,
        })

        const result = await loginWithPasskey(optionsResult.challengeId, authResponse)
        handleLoginResult(result)
      } catch {
        // WebAuthn Conditional UI 미지원 / 사용자가 취소 / 패스키 인증 실패
      }
    }

    initConditionalAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mt-8 space-y-6">
      {step === LoginStep.Step1_Email && (
        <form className="space-y-6" onSubmit={handleEmailSubmit}>
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input
              autoComplete="username webauthn"
              className="mt-2"
              id="email"
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              type="email"
              value={email}
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <Button className="w-full" type="submit">
            다음
          </Button>
        </form>
      )}
      {step === LoginStep.Step2_Credentials && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-primary">{email}</p>
            <button className="text-xs text-muted-foreground hover:underline" onClick={handleBack} type="button">
              다른 계정으로 로그인
            </button>
          </div>
          <Button className="w-full" disabled={isPending} onClick={handlePasskeyLogin} type="button">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
            패스키로 로그인
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">또는</span>
            </div>
          </div>
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">비밀번호</Label>
                <Link
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  href="/forgot-password"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
              <Input
                autoComplete="current-password"
                autoFocus
                className="mt-2"
                id="password"
                name="password"
                required
                type="password"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={rememberMe}
                id="rememberMe"
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label className="cursor-pointer font-normal text-sm" htmlFor="rememberMe">
                로그인 유지
              </Label>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button className="w-full" disabled={isPending} type="submit" variant="outline">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  비밀번호로 로그인
                </>
              )}
            </Button>
          </form>
        </div>
      )}
      <p className="text-center text-sm text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link className="text-foreground underline-offset-4 hover:underline" href="/register">
          회원가입
        </Link>
      </p>
    </div>
  )
}
