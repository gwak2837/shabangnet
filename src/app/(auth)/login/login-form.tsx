'use client'

import { Eye, EyeOff, Fingerprint, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import { GoogleOAuthButton } from '@/app/(auth)/google-oauth-button'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/lib/auth-client'

export function LoginForm() {
  const router = useRouter()
  const routerRef = useRef(router)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSuccess = useCallback((user: Record<string, unknown>, twoFactorRedirect?: boolean) => {
    // 2FA가 필요한 경우 MFA 페이지로 이동
    if (twoFactorRedirect) {
      routerRef.current.push('/mfa')
      return
    }

    if (!user.onboardingComplete) {
      routerRef.current.push('/onboarding')
      return
    }

    if (user.status === 'pending') {
      toast.info('관리자 승인을 기다려주세요')
      routerRef.current.push('/pending-approval')
      return
    }

    routerRef.current.push('/dashboard')
  }, [])

  async function handlePasskeyLogin() {
    setError('')
    setIsPending(true)

    try {
      const result = await signIn.passkey()

      if (result.error) {
        setError(result.error.message || '패스키 인증에 실패했어요')
        return
      }

      if (result.data?.user) {
        // 패스키 로그인은 MFA를 대체하므로 twoFactorRedirect는 false
        handleSuccess(result.data.user, false)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        toast.warning('패스키 인증이 취소됐어요')
      } else {
        setError('패스키 인증에 실패했어요')
      }
    } finally {
      setIsPending(false)
    }
  }

  async function handlePasswordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const rememberMe = formData.get('remember') === 'on'

    if (!email.trim()) {
      setError('이메일을 입력해주세요')
      return
    }

    if (!password) {
      setError('비밀번호를 입력해주세요')
      return
    }

    setIsPending(true)

    try {
      const result = await signIn.email({
        email,
        password,
        rememberMe,
      })

      if (result.error) {
        setError(result.error.message || '이메일 또는 비밀번호가 올바르지 않아요')
        return
      }

      if (result.data?.user) {
        // better-auth에서 2FA가 필요한 경우 twoFactorRedirect가 true
        const twoFactorRedirect = (result.data as { twoFactorRedirect?: boolean }).twoFactorRedirect
        handleSuccess(result.data.user, twoFactorRedirect)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('로그인 중 오류가 발생했어요')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 이메일/비밀번호 로그인 */}
      <form className="flex flex-col gap-4" onSubmit={handlePasswordLogin}>
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
            variant="glass"
          />
        </div>

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
          <div className="relative mt-2">
            <Input
              autoComplete="current-password"
              className="pr-10"
              disabled={isPending}
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              variant="glass"
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
        </div>

        <div className="flex items-center gap-2">
          <Checkbox className="glass-checkbox" disabled={isPending} id="remember" name="remember" />
          <Label className="cursor-pointer font-normal text-sm" htmlFor="remember">
            로그인 유지
          </Label>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <Button className="w-full" disabled={isPending} type="submit" variant="glass">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로그인 중...
            </>
          ) : (
            '로그인'
          )}
        </Button>
      </form>

      {/* 구분선 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="auth-divider w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-3 text-muted-foreground">또는</span>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={isPending}
        onClick={handlePasskeyLogin}
        type="button"
        variant="glass-outline"
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
        패스키로 로그인
      </Button>
      <GoogleOAuthButton disabled={isPending} />

      <p className="text-center text-sm text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link className="text-foreground underline-offset-4 hover:underline" href="/register">
          회원가입
        </Link>
      </p>
    </div>
  )
}
