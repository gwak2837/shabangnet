'use client'

import { Fingerprint, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { StepProps } from './common'

interface Props extends StepProps {
  isSocialUser: boolean
  onBack: () => void
  onSetup: () => void
}

export function Step3aPasskeySetup({ isPending, isSocialUser, onBack, onSetup }: Props) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      {!isSocialUser && (
        <div className="text-center">
          <button
            className="text-xs text-foreground/70 hover:text-foreground hover:underline"
            onClick={onBack}
            type="button"
          >
            ← 다른 방식 선택
          </button>
        </div>
      )}
      <div className="text-center flex flex-col gap-4">
        <Fingerprint className="mx-auto h-16 w-16 text-foreground/80" />
        <div>
          <h3 className="font-medium">패스키 등록</h3>
          <p className="text-sm text-muted-foreground mt-1">
            기기의 생체 인식 또는 PIN을 사용하여 패스키를 등록합니다.
          </p>
        </div>
      </div>
      <Button className="w-full" disabled={isPending} onClick={onSetup} variant="glass">
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
        패스키 등록하기
      </Button>
    </div>
  )
}
