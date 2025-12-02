'use client'

import { Eye, EyeOff, Fingerprint, KeyRound, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { GoogleOAuthButton } from '@/app/(auth)/google-oauth-button'
import { PasswordStrengthIndicator } from '@/app/(auth)/password-strength'
import { COMMON_PASSWORDS } from '@/common/constants/common-passwords'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { passkeyMethods, signUp } from '@/lib/auth-client'
import { PASSWORD_ERROR_MESSAGES, validatePassword } from '@/utils/password'

type AuthMethod = 'passkey' | 'password'

interface UserInfo {
  email: string
  name: string
}

export function RegisterForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, setIsPending] = useState(false)
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [error, setError] = useState('')

  const validation = validatePassword(password, COMMON_PASSWORDS)

  function handleMethodSelect(method: AuthMethod) {
    const formData = new FormData(formRef.current!)
    const name = formData.get('name') as string
    const email = formData.get('email') as string

    if (!name?.trim()) {
      setError('이름을 입력해주세요')
      return
    }
    if (!email?.trim()) {
      setError('이메일을 입력해주세요')
      return
    }

    setUserInfo({ name, email })
    setAuthMethod(method)
    setError('')
  }

  async function handlePasswordRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!userInfo) return

    const formData = new FormData(e.currentTarget)
    const formPassword = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (formPassword !== confirmPassword) {
      setError(PASSWORD_ERROR_MESSAGES.mismatch)
      return
    }

    setError('')
    setIsPending(true)

    try {
      const result = await signUp.email({
        email: userInfo.email,
        password: formPassword,
        name: userInfo.name,
      })

      if (result.error) {
        setError(result.error.message || '회원가입에 실패했어요')
        return
      }

      router.push('/onboarding')
    } catch {
      setError('회원가입 중 오류가 발생했어요')
    } finally {
      setIsPending(false)
    }
  }

  async function handlePasskeyRegister() {
    if (!userInfo) return

    setError('')
    setIsPending(true)

    try {
      // 1. 임시 비밀번호로 계정 생성
      const tempPassword = crypto.randomUUID() + crypto.randomUUID()

      const signUpResult = await signUp.email({
        email: userInfo.email,
        password: tempPassword,
        name: userInfo.name,
      })

      if (signUpResult.error) {
        setError(signUpResult.error.message || '회원가입에 실패했어요')
        return
      }

      // 세션이 완전히 설정될 때까지 잠시 대기
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 2. 패스키 등록
      const passkeyResult = await passkeyMethods.addPasskey({
        name: userInfo.email,
      })

      if (passkeyResult.error) {
        // 패스키 등록 실패 - 온보딩에서 다시 시도
        router.push('/onboarding')
        return
      }

      // 패스키 등록 성공 시 임시 비밀번호 삭제 및 온보딩 완료 처리
      try {
        await Promise.all([
          fetch('/api/auth/clear-temp-password', { method: 'POST' }),
          fetch('/api/auth/complete-onboarding', { method: 'POST' }),
        ])
      } catch {
        // 실패해도 계속 진행
      }
      router.push('/pending-approval')
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        // 패스키 취소해도 계정은 생성되었으므로 온보딩으로 이동
        router.push('/onboarding')
      } else {
        setError('회원가입 중 오류가 발생했어요')
      }
    } finally {
      setIsPending(false)
    }
  }

  function handleBack() {
    setAuthMethod(null)
    setPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setPasswordTouched(false)
    setError('')
  }

  // Step 1: 기본 정보 + 방법 선택
  if (!authMethod) {
    return (
      <div className="flex flex-col gap-6">
        <form className="flex flex-col gap-4" ref={formRef}>
          <div>
            <Label htmlFor="name">이름</Label>
            <Input
              autoComplete="name"
              className="mt-2"
              disabled={isPending}
              id="name"
              name="name"
              placeholder="홍길동"
              type="text"
            />
          </div>
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input
              autoComplete="email"
              className="mt-2"
              disabled={isPending}
              id="email"
              name="email"
              placeholder="example@email.com"
              type="email"
            />
          </div>
        </form>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <div className="flex flex-col gap-3">
          <Button className="w-full" disabled={isPending} onClick={() => handleMethodSelect('passkey')}>
            <Fingerprint className="mr-2 h-4 w-4" />
            패스키로 가입 (권장)
          </Button>

          <Button
            className="w-full"
            disabled={isPending}
            onClick={() => handleMethodSelect('password')}
            variant="outline"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            비밀번호로 가입
          </Button>
        </div>

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        {/* Google 가입 */}
        <GoogleOAuthButton disabled={isPending} label="Google로 가입" />

        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{' '}
          <Link className="text-foreground underline-offset-4 hover:underline" href="/login">
            로그인
          </Link>
        </p>
      </div>
    )
  }

  // Step 2a: 비밀번호 가입
  if (authMethod === 'password') {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <p className="text-sm text-primary">{userInfo?.email}</p>
          <button className="text-xs text-muted-foreground hover:underline" onClick={handleBack} type="button">
            다른 방식으로 가입
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handlePasswordRegister}>
          <div>
            <Label htmlFor="password">비밀번호</Label>
            <div className="relative mt-2">
              <Input
                autoComplete="new-password"
                autoFocus
                className="pr-10"
                disabled={isPending}
                id="password"
                name="password"
                onBlur={() => setPasswordTouched(true)}
                onChange={(e) => setPassword(e.target.value)}
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <PasswordStrengthIndicator password={password} showChecklist={passwordTouched} validation={validation} />
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <div className="relative mt-2">
              <Input
                autoComplete="new-password"
                className="pr-10"
                disabled={isPending}
                id="confirmPassword"
                name="confirmPassword"
                required
                type={showConfirmPassword ? 'text' : 'password'}
              />
              <button
                aria-label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                type="button"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <Button className="w-full" disabled={isPending || !validation.isValid} type="submit">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                가입 중...
              </>
            ) : (
              '가입하기'
            )}
          </Button>
        </form>
      </div>
    )
  }

  // Step 2b: 패스키 가입
  if (authMethod === 'passkey') {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <p className="text-sm text-primary">{userInfo?.email}</p>
          <button className="text-xs text-muted-foreground hover:underline" onClick={handleBack} type="button">
            다른 방식으로 가입
          </button>
        </div>

        <div className="text-center flex flex-col gap-4">
          <Fingerprint className="mx-auto h-16 w-16 text-muted-foreground" />
          <div>
            <h3 className="font-medium">패스키로 안전하게 가입</h3>
            <p className="text-sm text-muted-foreground mt-1">
              생체 인식 또는 기기 잠금으로 빠르고 안전하게 로그인할 수 있어요.
            </p>
          </div>
        </div>

        {error && <div className="text-sm text-destructive text-center">{error}</div>}

        <Button className="w-full" disabled={isPending} onClick={handlePasskeyRegister}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              가입 중...
            </>
          ) : (
            '패스키로 가입하기'
          )}
        </Button>
      </div>
    )
  }

  return null
}
