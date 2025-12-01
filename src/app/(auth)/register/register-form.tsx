'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import { PasswordStrengthIndicator } from '@/app/(auth)/password-strength'
import { register } from '@/app/(auth)/register/actions'
import { COMMON_PASSWORDS } from '@/common/constants/common-passwords'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PASSWORD_ERROR_MESSAGES, validatePassword } from '@/utils/password'

export function RegisterForm() {
  const [state, dispatch, isPending] = useActionState(register, undefined)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const validation = validatePassword(password, COMMON_PASSWORDS)
  const passwordsMatch = password === confirmPassword
  const showMismatchError = confirmTouched && confirmPassword && !passwordsMatch

  return (
    <div className="mt-8 space-y-6">
      <form action={dispatch} className="space-y-6">
        <div>
          <Label htmlFor="name">이름</Label>
          <Input autoComplete="name" className="mt-2" id="name" name="name" required type="text" />
        </div>
        <div>
          <Label htmlFor="email">이메일</Label>
          <Input autoComplete="email" className="mt-2" id="email" name="email" required type="email" />
        </div>
        <div>
          <Label htmlFor="password">비밀번호</Label>
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
          />
          {password && (
            <PasswordStrengthIndicator password={password} showChecklist={passwordTouched} validation={validation} />
          )}
        </div>
        <div>
          <Label htmlFor="confirmPassword">비밀번호 확인</Label>
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
          />
          {showMismatchError && <p className="mt-1 text-sm text-destructive">{PASSWORD_ERROR_MESSAGES.mismatch}</p>}
          {confirmTouched && passwordsMatch && confirmPassword && (
            <p className="mt-1 text-sm text-emerald-500">비밀번호가 일치해요</p>
          )}
        </div>
        {state && 'error' in state && <div className="text-sm text-destructive">{state.error}</div>}
        {state && 'success' in state && <div className="text-sm text-emerald-500">{state.success}</div>}
        <Button className="w-full" disabled={isPending || !validation.isValid || !passwordsMatch} type="submit">
          {isPending ? '생성 중...' : '계정 생성'}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
        <Link className="font-medium text-primary hover:text-primary/90" href="/login">
          로그인
        </Link>
      </div>
    </div>
  )
}
