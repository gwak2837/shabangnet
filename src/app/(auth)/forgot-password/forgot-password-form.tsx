'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { requestPasswordReset } from '@/app/(auth)/forgot-password/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordForm() {
  const [state, dispatch, isPending] = useActionState(requestPasswordReset, undefined)

  return (
    <div className="mt-8 flex flex-col gap-6">
      <form action={dispatch} className="flex flex-col gap-6">
        <div>
          <Label htmlFor="email">이메일</Label>
          <Input autoComplete="email" className="mt-2" id="email" name="email" required type="email" />
        </div>
        {state && 'error' in state && <div className="text-sm text-destructive">{state.error}</div>}
        {state && 'success' in state && <div className="text-sm text-emerald-500">{state.success}</div>}
        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? '전송 중...' : '재설정 링크 받기'}
        </Button>
      </form>
      <div className="text-center text-sm">
        <Link className="font-medium text-primary hover:text-primary/90" href="/login">
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
