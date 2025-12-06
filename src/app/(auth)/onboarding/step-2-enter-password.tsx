'use client'

import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { StepProps } from './common'

interface Props extends StepProps {
  formRef: React.RefObject<HTMLFormElement | null>
  onBack: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export function Step2EnterPassword({ formRef, isPending, onBack, onSubmit }: Props) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="text-center">
        <button
          className="text-xs text-foreground/70 hover:text-foreground hover:underline"
          onClick={onBack}
          type="button"
        >
          ← 다른 방식 선택
        </button>
      </div>
      <p className="text-sm text-center text-muted-foreground">TOTP 설정을 위해 비밀번호를 입력해주세요</p>
      <form className="flex flex-col gap-6" onSubmit={onSubmit} ref={formRef}>
        <div>
          <Label htmlFor="password">비밀번호</Label>
          <div className="relative mt-2">
            <Input
              autoComplete="current-password"
              autoFocus
              className="pr-10"
              disabled={isPending}
              id="password"
              name="password"
              required
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
        <Button className="w-full" disabled={isPending} type="submit" variant="glass">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '다음'}
        </Button>
      </form>
    </div>
  )
}
