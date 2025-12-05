'use client'

import { AlertTriangle, Fingerprint, KeyRound, Loader2, Smartphone } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

type MfaMethod = 'passkey' | 'recovery' | 'totp'

export function MfaChallenge() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, setIsPending] = useState(false)

  const [selectedMethod, setSelectedMethod] = useState<MfaMethod>('totp')
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [error, setError] = useState('')
  const [trustDevice, setTrustDevice] = useState(false)

  // 복구 코드로 로그인한 경우 경고 표시
  const recoveryLogin = searchParams.get('recovery') === 'true'

  // TOTP 검증
  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsPending(true)

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: totpCode,
        trustDevice,
        fetchOptions: {
          onSuccess: () => {
            router.push('/dashboard')
          },
          onError: (ctx) => {
            setError(ctx.error.message || '인증 코드가 올바르지 않아요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || '인증 코드가 올바르지 않아요')
      }
    } catch {
      setError('인증 중 오류가 발생했어요')
    } finally {
      setIsPending(false)
    }
  }

  // 패스키 인증
  async function handlePasskeyAuth() {
    setError('')
    setIsPending(true)

    try {
      const result = await authClient.signIn.passkey({
        fetchOptions: {
          onSuccess: () => {
            router.push('/dashboard')
          },
          onError: (ctx) => {
            setError(ctx.error.message || '패스키 인증에 실패했어요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || '패스키 인증에 실패했어요')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('패스키 인증이 취소되었습니다.')
      } else {
        setError('패스키 인증 중 오류가 발생했어요')
      }
    } finally {
      setIsPending(false)
    }
  }

  // 복구 코드 검증
  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsPending(true)

    try {
      const result = await authClient.twoFactor.verifyBackupCode({
        code: recoveryCode,
        fetchOptions: {
          onSuccess: () => {
            router.push('/settings?recovery=true')
          },
          onError: (ctx) => {
            setError(ctx.error.message || '복구 코드가 올바르지 않아요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || '복구 코드가 올바르지 않아요')
      }
    } catch {
      setError('인증 중 오류가 발생했어요')
    } finally {
      setIsPending(false)
    }
  }

  // 방식 변경
  function handleMethodChange(method: MfaMethod) {
    setSelectedMethod(method)
    setError('')
    setTotpCode('')
    setRecoveryCode('')
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

          <form className="flex flex-col gap-4" onSubmit={handleTotpSubmit}>
            <div>
              <Label htmlFor="totpCode">인증 코드</Label>
              <Input
                autoComplete="one-time-code"
                autoFocus
                className="mt-2 text-center text-2xl tracking-widest"
                id="totpCode"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                pattern="[0-9]*"
                placeholder="000000"
                value={totpCode}
                variant="glass"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={trustDevice}
                className="glass-checkbox"
                id="trustDevice"
                onCheckedChange={(checked) => setTrustDevice(checked === true)}
              />
              <Label className="cursor-pointer font-normal text-sm" htmlFor="trustDevice">
                이 브라우저 신뢰
              </Label>
            </div>

            {error && <div className="text-sm text-destructive text-center">{error}</div>}

            <Button className="w-full" disabled={isPending || totpCode.length !== 6} type="submit" variant="glass">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                '확인'
              )}
            </Button>
          </form>

          <Button className="w-full" onClick={() => handleMethodChange('passkey')} variant="glass-outline">
            <Fingerprint className="mr-2 h-4 w-4" />
            패스키로 인증
          </Button>
        </div>
      )}

      {/* 패스키 인증 */}
      {selectedMethod === 'passkey' && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <Fingerprint className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">패스키 인증</h3>
            <p className="mt-2 text-sm text-muted-foreground">등록된 패스키로 본인 인증을 완료해주세요.</p>
          </div>

          {error && <div className="text-sm text-destructive text-center">{error}</div>}

          <Button className="w-full" disabled={isPending} onClick={handlePasskeyAuth} variant="glass">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                인증 중...
              </>
            ) : (
              <>
                <Fingerprint className="mr-2 h-4 w-4" />
                패스키로 인증
              </>
            )}
          </Button>

          <Button className="w-full" onClick={() => handleMethodChange('totp')} variant="glass-outline">
            <Smartphone className="mr-2 h-4 w-4" />
            인증 앱으로 인증
          </Button>
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
                className="mt-2 font-mono"
                id="recoveryCode"
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                value={recoveryCode}
                variant="glass"
              />
            </div>

            {error && <div className="text-sm text-destructive text-center">{error}</div>}

            <Button className="w-full" disabled={isPending || !recoveryCode.trim()} type="submit" variant="glass">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                '확인'
              )}
            </Button>
          </form>

          <Button className="w-full" onClick={() => handleMethodChange('totp')} variant="glass-outline">
            다른 방식으로 인증
          </Button>
        </div>
      )}

      {/* 복구 코드 링크 */}
      {selectedMethod !== 'recovery' && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="auth-divider w-full border-t" />
            </div>
          </div>
          <div className="text-center">
            <button
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              onClick={() => handleMethodChange('recovery')}
              type="button"
            >
              인증 수단을 사용할 수 없나요?
            </button>
          </div>
        </>
      )}
    </div>
  )
}
