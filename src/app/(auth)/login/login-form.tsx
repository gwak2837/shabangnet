'use client'

import { Eye, EyeOff, Fingerprint, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { GoogleOAuthButton } from '@/app/(auth)/google-oauth-button'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

import { AppleOAuthButton } from '../apple-oauth-button'

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isEmailPasswordPending, setIsEmailPasswordPending] = useState(false)
  const [isPasskeyPending, setIsPasskeyPending] = useState(false)
  const isPending = isEmailPasswordPending || isPasskeyPending

  async function handlePasswordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('email'))
    const password = String(formData.get('password'))
    const rememberMe = formData.get('remember') === 'on'

    if (!email.trim()) {
      toast.warning('이메일을 입력해주세요')
      return
    }

    if (!password) {
      toast.warning('비밀번호를 입력해주세요')
      return
    }

    setIsEmailPasswordPending(true)

    const result = await authClient.signIn.email({
      email,
      password,
      rememberMe,
    })

    setIsEmailPasswordPending(false)

    if (result.error) {
      toast.error(result.error.message || '이메일 또는 비밀번호가 올바르지 않아요')
      return
    }

    router.push('/dashboard')
  }

  async function handlePasskeyLogin() {
    setIsPasskeyPending(true)
    const result = await authClient.signIn.passkey()
    setIsPasskeyPending(false)

    if (result.error) {
      toast.error(result.error.message || '패스키 인증에 실패했어요')
      return
    }

    router.push('/dashboard')
  }

  // NOTE: Conditional UI 패스키 로그인
  useEffect(() => {
    if (
      !PublicKeyCredential.isConditionalMediationAvailable ||
      !PublicKeyCredential.isConditionalMediationAvailable()
    ) {
      return
    }

    void authClient.signIn.passkey({
      autoFill: true,
      fetchOptions: {
        onSuccess: () => {
          router.push('/dashboard')
        },
        onError: (context) => {
          toast.error(context.error.message || '패스키 인증에 실패했어요')
        },
      },
    })
  }, [router])

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-4" onSubmit={handlePasswordLogin}>
        <div>
          <Label htmlFor="email">이메일</Label>
          <Input
            autoComplete="email webauthn"
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
              autoComplete="current-password webauthn"
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
        <Button className="w-full" disabled={isPending} type="submit" variant="glass">
          {isEmailPasswordPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '로그인'}
        </Button>
      </form>
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
        {isPasskeyPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="mr-2 h-4 w-4" />
        )}
        패스키로 로그인
      </Button>
      <GoogleOAuthButton disabled={isPending}>Google로 로그인</GoogleOAuthButton>
      <AppleOAuthButton disabled={isPending}>Apple로 로그인</AppleOAuthButton>
      <p className="text-center text-sm text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link className="text-foreground underline-offset-4 hover:underline" href="/register">
          회원가입
        </Link>
      </p>
    </div>
  )
}
