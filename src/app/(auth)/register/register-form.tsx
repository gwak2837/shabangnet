'use client'

import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { GoogleOAuthButton } from '@/app/(auth)/google-oauth-button'
import { PasswordStrengthIndicator } from '@/app/(auth)/password-strength'
import { COMMON_PASSWORDS } from '@/common/constants/common-passwords'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/lib/auth-client'
import { getFirstPasswordError, PASSWORD_ERROR_MESSAGES, validatePassword } from '@/utils/password'

export function RegisterForm() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [error, setError] = useState('')

  const validation = validatePassword(password, COMMON_PASSWORDS)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const formPassword = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!name?.trim()) {
      setError('이름을 입력해주세요')
      return
    }
    if (!email?.trim()) {
      setError('이메일을 입력해주세요')
      return
    }
    if (formPassword !== confirmPassword) {
      setError(PASSWORD_ERROR_MESSAGES.mismatch)
      return
    }

    setError('')
    setIsPending(true)

    try {
      const result = await signUp.email({
        email,
        password: formPassword,
        name,
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

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
            variant="glass"
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
            variant="glass"
          />
        </div>

        <div>
          <Label htmlFor="password">비밀번호</Label>
          <div className="relative mt-2">
            <Input
              autoComplete="new-password"
              className="pr-10"
              disabled={isPending}
              id="password"
              name="password"
              onBlur={() => setPasswordTouched(true)}
              onChange={(e) => setPassword(e.target.value)}
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
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
          {password && (
            <PasswordStrengthIndicator
              errorMessage={passwordTouched ? getFirstPasswordError(validation) : undefined}
              password={password}
            />
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
              variant="glass"
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

        <Button className="w-full" disabled={isPending || !validation.isValid} type="submit" variant="glass">
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

      {/* 구분선 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="auth-divider w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-3 text-muted-foreground">또는</span>
        </div>
      </div>

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
