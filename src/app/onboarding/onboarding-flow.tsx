'use client'

import { Check, Copy, Download, Fingerprint, Loader2, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { passkeyMethods, twoFactor, useSession } from '@/lib/auth-client'

type MfaMethod = 'passkey' | 'totp'
type OnboardingStep = 'choose-method' | 'recovery-codes' | 'setup-passkey' | 'setup-totp'

export function OnboardingFlow() {
  const router = useRouter()
  const { data: session, isPending: isSessionPending } = useSession()
  const [isPending, setIsPending] = useState(false)
  const [step, setStep] = useState<OnboardingStep>('choose-method')
  const [error, setError] = useState('')
  const [hasExistingPasskey, setHasExistingPasskey] = useState(false)

  const userEmail = session?.user?.email || ''

  // 이미 패스키가 있는지 확인
  useEffect(() => {
    async function checkExistingPasskey() {
      try {
        const result = await passkeyMethods.listUserPasskeys()
        if (result.data && result.data.length > 0) {
          setHasExistingPasskey(true)
        }
      } catch {
        // 무시
      }
    }
    checkExistingPasskey()
  }, [])

  // TOTP 설정 상태
  const [totpUri, setTotpUri] = useState('')
  const [totpCode, setTotpCode] = useState('')

  // 복구 코드 상태
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [codesConfirmed, setCodesConfirmed] = useState(false)
  const [codesCopied, setCodesCopied] = useState(false)

  // MFA 방식 선택
  async function handleMethodSelect(method: MfaMethod) {
    setError('')
    setIsPending(true)

    try {
      if (method === 'totp') {
        // TOTP 활성화 시작
        const result = await twoFactor.enable({
          password: '', // better-auth에서 세션이 있으면 비밀번호 없이 활성화 가능
          fetchOptions: {
            onSuccess: (ctx) => {
              // totpURI가 응답에 포함됨
              const data = ctx.data as { totpURI?: string; backupCodes?: string[] }
              if (data.totpURI) {
                setTotpUri(data.totpURI)
                if (data.backupCodes) {
                  setBackupCodes(data.backupCodes)
                }
                setStep('setup-totp')
              }
            },
            onError: (ctx) => {
              setError(ctx.error.message || 'TOTP 설정에 실패했어요')
            },
          },
        })

        if (result.error) {
          setError(result.error.message || 'TOTP 설정에 실패했어요')
        }
      } else {
        setStep('setup-passkey')
      }
    } catch {
      setError('설정 중 오류가 발생했어요')
    } finally {
      setIsPending(false)
    }
  }

  // TOTP 코드 검증
  async function handleTotpVerify() {
    setError('')
    setIsPending(true)

    try {
      const result = await twoFactor.verifyTotp({
        code: totpCode,
        fetchOptions: {
          onSuccess: () => {
            // 백업 코드가 이미 있으면 복구 코드 단계로
            if (backupCodes.length > 0) {
              setStep('recovery-codes')
            } else {
              // 온보딩 완료
              completeOnboarding()
            }
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

  // 패스키 등록
  async function handlePasskeySetup() {
    setError('')
    setIsPending(true)

    try {
      const result = await passkeyMethods.addPasskey({
        name: userEmail,
        fetchOptions: {
          onSuccess: async () => {
            // 패스키 등록 후 임시 비밀번호 삭제 및 온보딩 완료
            try {
              await fetch('/api/auth/clear-temp-password', { method: 'POST' })
            } catch {
              // 실패해도 계속 진행
            }
            completeOnboarding()
          },
          onError: (ctx) => {
            setError(ctx.error.message || '패스키 등록에 실패했어요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || '패스키 등록에 실패했어요')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('패스키 등록이 취소되었습니다.')
      } else {
        setError('패스키 등록에 실패했어요')
      }
    } finally {
      setIsPending(false)
    }
  }

  // 복구 코드 복사
  async function handleCopyCodes() {
    const codesText = backupCodes.join('\n')
    await navigator.clipboard.writeText(codesText)
    setCodesCopied(true)
    setTimeout(() => setCodesCopied(false), 2000)
  }

  // 복구 코드 다운로드
  function handleDownloadCodes() {
    const codesText = backupCodes.join('\n')
    const blob = new Blob([`다온 OMS 복구 코드\n\n${codesText}\n\n이 코드를 안전한 곳에 보관하세요.`], {
      type: 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'daon-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // 온보딩 완료
  async function completeOnboarding() {
    setIsPending(true)

    try {
      // 서버에서 onboardingComplete 업데이트
      const response = await fetch('/api/auth/complete-onboarding', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/pending-approval')
      } else {
        setError('온보딩 완료 처리에 실패했어요')
      }
    } catch {
      setError('온보딩 완료 처리에 실패했어요')
    } finally {
      setIsPending(false)
    }
  }

  // 뒤로가기
  function handleBack() {
    setStep('choose-method')
    setTotpCode('')
    setError('')
  }

  // QR 코드 이미지 생성 (totpUri에서)
  function generateQRCodeUrl(uri: string): string {
    // Google Charts API를 사용한 QR 코드 생성
    return `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(uri)}&choe=UTF-8`
  }

  // totpUri에서 secret 추출
  function extractSecret(uri: string): string {
    const match = uri.match(/secret=([A-Z2-7]+)/i)
    return match ? match[1] : ''
  }

  if (isSessionPending) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Step 1: MFA 방식 선택 */}
      {step === 'choose-method' && (
        <div className="space-y-4">
          {hasExistingPasskey ? (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm text-muted-foreground">이미 패스키가 등록되어 있어요!</p>
              </div>
              <Button className="w-full" disabled={isPending} onClick={completeOnboarding}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '설정 완료'
                )}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-center text-muted-foreground">
                로그인 보안을 위해 2차 인증 방식을 선택해주세요
              </p>

              <Button
                className="w-full h-auto py-4"
                disabled={isPending}
                onClick={() => handleMethodSelect('passkey')}
                variant="outline"
              >
                <div className="flex items-center gap-3 w-full">
                  <Fingerprint className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">패스키 (권장)</div>
                    <div className="text-xs text-muted-foreground">생체 인식으로 빠르고 안전하게</div>
                  </div>
                </div>
              </Button>

              <Button
                className="w-full h-auto py-4"
                disabled={isPending}
                onClick={() => handleMethodSelect('totp')}
                variant="outline"
              >
                <div className="flex items-center gap-3 w-full">
                  <Smartphone className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">인증 앱 (TOTP)</div>
                    <div className="text-xs text-muted-foreground">Google Authenticator 등 사용</div>
                  </div>
                </div>
              </Button>
            </>
          )}

          {error && <div className="text-sm text-destructive text-center">{error}</div>}
        </div>
      )}

      {/* Step 2-A: TOTP 설정 */}
      {step === 'setup-totp' && (
        <div className="space-y-6">
          <div className="text-center">
            <button className="text-xs text-primary hover:underline" onClick={handleBack} type="button">
              ← 다른 방식 선택
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">인증 앱에서 QR 코드를 스캔하세요</p>
              {totpUri && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="TOTP QR Code"
                    className="rounded-lg border"
                    height={200}
                    src={generateQRCodeUrl(totpUri)}
                    width={200}
                  />
                </div>
              )}
              {totpUri && (
                <p className="text-xs text-muted-foreground mt-2">
                  또는 수동 입력: <code className="bg-muted px-1 rounded">{extractSecret(totpUri)}</code>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="totpCode">인증 코드 입력</Label>
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
              />
            </div>

            {error && <div className="text-sm text-destructive text-center">{error}</div>}

            <Button className="w-full" disabled={isPending || totpCode.length !== 6} onClick={handleTotpVerify}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                '확인'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2-B: 패스키 설정 */}
      {step === 'setup-passkey' && (
        <div className="space-y-6">
          <div className="text-center">
            <button className="text-xs text-primary hover:underline" onClick={handleBack} type="button">
              ← 다른 방식 선택
            </button>
          </div>

          <div className="text-center space-y-4">
            <Fingerprint className="mx-auto h-16 w-16 text-primary" />
            <div>
              <h3 className="font-medium">패스키 등록</h3>
              <p className="text-sm text-muted-foreground mt-1">
                기기의 생체 인식 또는 PIN을 사용하여 패스키를 등록합니다.
              </p>
            </div>
          </div>

          {error && <div className="text-sm text-destructive text-center">{error}</div>}

          <Button className="w-full" disabled={isPending} onClick={handlePasskeySetup}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                등록 중...
              </>
            ) : (
              <>
                <Fingerprint className="mr-2 h-4 w-4" />
                패스키 등록하기
              </>
            )}
          </Button>
        </div>
      )}

      {/* Step 3: 복구 코드 확인 */}
      {step === 'recovery-codes' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-medium">2차 인증 설정 완료!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              아래 복구 코드를 안전한 곳에 보관하세요.
              <br />
              인증 수단을 분실했을 때 필요합니다.
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div className="bg-background px-2 py-1 rounded text-center" key={index}>
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleCopyCodes} variant="outline">
              {codesCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  복사
                </>
              )}
            </Button>
            <Button className="flex-1" onClick={handleDownloadCodes} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              다운로드
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={codesConfirmed}
              id="codesConfirmed"
              onCheckedChange={(checked) => setCodesConfirmed(checked === true)}
            />
            <Label className="cursor-pointer font-normal text-sm" htmlFor="codesConfirmed">
              복구 코드를 안전하게 보관했습니다
            </Label>
          </div>

          {error && <div className="text-sm text-destructive text-center">{error}</div>}

          <Button className="w-full" disabled={!codesConfirmed || isPending} onClick={completeOnboarding}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                완료 처리 중...
              </>
            ) : (
              '설정 완료'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
