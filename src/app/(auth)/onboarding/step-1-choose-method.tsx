'use client'

import { Fingerprint, Loader2, LogOut, Smartphone } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { StepProps } from './common'

interface Props extends StepProps {
  hasExistingPasskey: boolean
  isSocialUser: boolean
  onComplete: () => void
  onLogout: () => void
  onSelectPasskey: () => void
  onSelectTOTP: () => void
}

export function Step1ChooseMethod({
  hasExistingPasskey,
  isPending,
  isSocialUser,
  onComplete,
  onLogout,
  onSelectPasskey,
  onSelectTOTP,
}: Props) {
  if (hasExistingPasskey) {
    return (
      <div className="mt-6 flex flex-col gap-6">
        <div className="text-center flex flex-col gap-2">
          <div className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20">
            <Fingerprint className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-muted-foreground">이미 패스키가 등록되어 있어요!</p>
        </div>
        <Button className="w-full" disabled={isPending} onClick={onComplete} variant="glass">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '설정 완료'}
        </Button>
      </div>
    )
  }

  if (isSocialUser) {
    return (
      <div className="mt-6 flex flex-col gap-6">
        <p className="text-sm text-center text-muted-foreground">소셜 계정 보안 강화를 위해 패스키를 등록해주세요</p>
        <Button className="w-full h-auto py-4" disabled={isPending} onClick={onSelectPasskey} variant="glass-outline">
          <div className="flex items-center gap-3 w-full">
            <Fingerprint className="h-8 w-8 text-foreground" />
            <div className="text-left">
              <div className="font-medium">패스키 등록</div>
              <div className="text-xs text-muted-foreground">생체 인식으로 빠르고 안전하게</div>
            </div>
          </div>
        </Button>
        <Button className="w-full" disabled={isPending} onClick={onLogout} variant="glass-outline">
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Button className="w-full h-auto py-4" disabled={isPending} onClick={onSelectPasskey} variant="glass-outline">
        <div className="flex items-center gap-3 w-full">
          <Fingerprint className="h-8 w-8 text-foreground" />
          <div className="text-left">
            <div className="font-medium">패스키</div>
            <div className="text-xs text-muted-foreground">생체 인식으로 빠르고 안전하게</div>
          </div>
        </div>
      </Button>
      <Button className="w-full h-auto py-4" disabled={isPending} onClick={onSelectTOTP} variant="glass-outline">
        <div className="flex items-center gap-3 w-full">
          <Smartphone className="h-8 w-8 text-foreground" />
          <div className="text-left">
            <div className="font-medium">인증 앱 (TOTP)</div>
            <div className="text-xs text-muted-foreground">Google Authenticator 등 사용</div>
          </div>
        </div>
      </Button>
      <Button className="w-full" disabled={isPending} onClick={onLogout} variant="glass-outline">
        <LogOut className="mr-2 h-4 w-4" />
        로그아웃
      </Button>
    </div>
  )
}
