'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { register } from '@/app/(auth)/register/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const [state, dispatch, isPending] = useActionState(register, undefined)

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
          <Input autoComplete="new-password" className="mt-2" id="password" name="password" required type="password" />
        </div>

        {state && 'error' in state && <div className="text-sm text-destructive">{state.error}</div>}
        {state && 'success' in state && <div className="text-sm text-emerald-500">{state.success}</div>}

        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? '계정 생성 중...' : '계정 생성'}
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
