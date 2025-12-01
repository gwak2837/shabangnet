'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { login } from '@/app/(auth)/login/actions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [state, dispatch, isPending] = useActionState(login, undefined)

  return (
    <div className="mt-8 space-y-6">
      <form action={dispatch} className="space-y-6">
        <div>
          <Label htmlFor="email">이메일</Label>
          <Input autoComplete="email" className="mt-2" id="email" name="email" required type="email" />
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
          <Input
            autoComplete="current-password"
            className="mt-2"
            id="password"
            name="password"
            required
            type="password"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="rememberMe" name="rememberMe" />
          <Label className="cursor-pointer font-normal" htmlFor="rememberMe">
            로그인 유지 (30일)
          </Label>
        </div>
        {state?.error && <div className="text-sm text-destructive">{state.error}</div>}
        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? '처리 중' : '로그인'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link className="text-foreground underline-offset-4 hover:underline" href="/register">
          회원가입
        </Link>
      </p>
    </div>
  )
}
