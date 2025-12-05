'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import { PasswordStrengthIndicator } from '@/app/(auth)/password-strength'
import { resetPassword } from '@/app/(auth)/reset-password/actions'
import { COMMON_PASSWORDS } from '@/common/constants/common-passwords'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getFirstPasswordError, PASSWORD_ERROR_MESSAGES, validatePassword } from '@/utils/password'

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, dispatch, isPending] = useActionState(resetPassword, undefined)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const validation = validatePassword(password, COMMON_PASSWORDS)
  const passwordsMatch = password === confirmPassword
  const showMismatchError = confirmTouched && confirmPassword && !passwordsMatch

  // 성공 시 로그인 페이지로 안내
  if (state && 'success' in state) {
    return (
      <div className="mt-8 flex flex-col gap-6 text-center">
        <div className="glass-panel rounded-lg p-4 text-emerald-700 dark:text-emerald-300">
          <p>{state.success}</p>
        </div>
        <Button asChild variant="glass">
          <Link href="/login">로그인하기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <form action={dispatch} className="flex flex-col gap-6">
        <input name="token" type="hidden" value={token} />
        <div>
          <Label htmlFor="password">새 비밀번호</Label>
          <Input
            autoComplete="new-password"
            className="mt-2"
            id="password"
            name="password"
            onBlur={() => setPasswordTouched(true)}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
            variant="glass"
          />
          {password && (
            <PasswordStrengthIndicator
              errorMessage={passwordTouched ? getFirstPasswordError(validation) : undefined}
              password={password}
            />
          )}
        </div>
        <div>
          <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
          <Input
            autoComplete="new-password"
            className="mt-2"
            id="confirmPassword"
            name="confirmPassword"
            onBlur={() => setConfirmTouched(true)}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            type="password"
            value={confirmPassword}
            variant="glass"
          />
          {showMismatchError && <p className="mt-1 text-sm text-destructive">{PASSWORD_ERROR_MESSAGES.mismatch}</p>}
          {confirmTouched && passwordsMatch && confirmPassword && (
            <p className="mt-1 text-sm text-emerald-500">비밀번호가 일치해요</p>
          )}
        </div>
        {state && 'error' in state && <div className="text-sm text-destructive">{state.error}</div>}
        <Button
          className="w-full"
          disabled={isPending || !validation.isValid || !passwordsMatch}
          type="submit"
          variant="glass"
        >
          {isPending ? '변경 중...' : '비밀번호 변경'}
        </Button>
      </form>
      <div className="text-center text-sm">
        <Link className="font-medium text-foreground hover:text-foreground/80" href="/login">
          로그인하기
        </Link>
      </div>
    </div>
  )
}
