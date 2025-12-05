'use client'

import { AlertTriangle, KeyRound, Loader2, LogOut, Smartphone } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

type MFAMethod = 'passkey' | 'recovery' | 'totp'

export function MFAChallenge() {
  const searchParams = useSearchParams()
  const [isPending, setIsPending] = useState(false)
  const [isLoggingOut, startLogoutTransition] = useTransition()
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>('totp')
  const recoveryLogin = searchParams.get('recovery') === 'true'

  async function handleTOTPSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const code = String(formData.get('totpCode'))
    const trustDevice = formData.get('trustDevice') === 'on'

    await authClient.twoFactor.verifyTotp({
      code,
      trustDevice,
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/dashboard'
        },
        onError: (ctx) => {
          toast.error(ctx.error.message || '인증 코드가 올바르지 않아요')
          setIsPending(false)
        },
      },
    })

    setIsPending(false)
  }

  async function handleRecoverySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const code = String(formData.get('recoveryCode')).toUpperCase()

    await authClient.twoFactor.verifyBackupCode({
      code,
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/settings?recovery=true'
        },
        onError: (ctx) => {
          toast.error(ctx.error.message || '복구 코드가 올바르지 않아요')
        },
      },
    })

    setIsPending(false)
  }

  function handleMethodChange(method: MFAMethod) {
    setSelectedMethod(method)
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      await authClient.signOut()
      window.location.href = '/login'
    })
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* 복구 코드 경고 배너 */}
      {recoveryLogin && (
        <div className="glass-panel flex items-center gap-3 rounded-lg p-4 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">복구 코드로 로그인했습니다</p>
            <p className="mt-1 opacity-80">보안 설정을 점검해주세요.</p>
          </div>
        </div>
      )}

      {/* TOTP 인증 */}
      {selectedMethod === 'totp' && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <Smartphone className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">인증 앱 코드 입력</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Google Authenticator 또는 인증 앱에서 6자리 코드를 입력해주세요.
            </p>
          </div>
          <form className="flex flex-col gap-4" onSubmit={handleTOTPSubmit}>
            <div>
              <Label htmlFor="totpCode">인증 코드</Label>
              <Input
                autoComplete="one-time-code"
                autoFocus
                className="mt-2 text-center text-2xl tracking-widest"
                id="totpCode"
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                name="totpCode"
                pattern="[0-9]*"
                placeholder="000000"
                required
                variant="glass"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox className="glass-checkbox" id="trustDevice" name="trustDevice" />
              <Label className="cursor-pointer font-normal text-sm" htmlFor="trustDevice">
                이 브라우저 신뢰
              </Label>
            </div>

            <Button className="w-full" disabled={isPending} type="submit" variant="glass">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '확인'}
            </Button>
          </form>
        </div>
      )}

      {/* 복구 코드 인증 */}
      {selectedMethod === 'recovery' && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <KeyRound className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">복구 코드 입력</h3>
            <p className="mt-2 text-sm text-muted-foreground">가입 시 발급받은 복구 코드 중 하나를 입력해주세요.</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleRecoverySubmit}>
            <div>
              <Label htmlFor="recoveryCode">복구 코드</Label>
              <Input
                autoComplete="off"
                autoFocus
                className="mt-2 font-mono uppercase"
                id="recoveryCode"
                name="recoveryCode"
                placeholder="XXXX-XXXX"
                required
                variant="glass"
              />
            </div>
            <Button className="w-full" disabled={isPending} type="submit" variant="glass">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '확인'}
            </Button>
          </form>
          <Button onClick={() => handleMethodChange('totp')} variant="glass-outline">
            <Smartphone className="h-4 w-4" />
            인증 앱으로 인증
          </Button>
        </div>
      )}

      {/* 복구 코드 링크 */}
      {selectedMethod !== 'recovery' && (
        <Button
          className="w-fit mx-auto text-muted-foreground hover:text-foreground"
          onClick={() => handleMethodChange('recovery')}
          type="button"
          variant="link"
        >
          인증 수단을 사용할 수 없나요?
        </Button>
      )}
      <div className="text-center">
        <button
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          disabled={isLoggingOut}
          onClick={handleLogout}
          type="button"
        >
          {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  )
}
