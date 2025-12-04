'use client'

import { Check, Copy, Download, Eye, EyeOff, Fingerprint, Loader2, LogOut, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { passkeyMethods, signOut, twoFactor, useSession } from '@/lib/auth-client'

type OnboardingStep = 'backup-codes' | 'choose-method' | 'enter-password' | 'passkey-setup' | 'totp-setup'

/**
 * 온보딩 플로우
 * - 소셜 사용자: 패스키만 선택 가능 (better-auth 제약: 소셜 계정은 TOTP 불가)
 * - 비밀번호 사용자: TOTP(비밀번호 재입력 필요) 또는 패스키 선택 가능
 */
export function OnboardingFlow() {
  const router = useRouter()
  const { data: session, isPending: isSessionPending } = useSession()
  const [isPending, setIsPending] = useState(false)
  const [step, setStep] = useState<OnboardingStep>('choose-method')
  const [error, setError] = useState('')
  const [hasExistingPasskey, setHasExistingPasskey] = useState(false)

  const userEmail = session?.user?.email || ''
  const isSocialUser = session?.user?.authType === 'social'

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

  // TOTP 상태
  const [totpPassword, setTotpPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [totpUri, setTotpUri] = useState('')
  const [totpCode, setTotpCode] = useState('')

  // 백업 코드 상태
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [codesConfirmed, setCodesConfirmed] = useState(false)
  const [codesCopied, setCodesCopied] = useState(false)

  // MFA 방식 선택
  function handleSelectTOTP() {
    setStep('enter-password')
  }

  function handleSelectPasskey() {
    setStep('passkey-setup')
  }

  // TOTP 활성화 (비밀번호 입력 후)
  async function handleEnableTOTP() {
    setError('')
    setIsPending(true)

    try {
      const result = await twoFactor.enable({
        password: totpPassword,
        fetchOptions: {
          onSuccess: (ctx) => {
            const data = ctx.data as { totpURI?: string; backupCodes?: string[] }
            if (data.totpURI) {
              setTotpUri(data.totpURI)
              if (data.backupCodes) {
                setBackupCodes(data.backupCodes)
              }
              setStep('totp-setup')
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
    } catch {
      setError('TOTP 설정 중 오류가 발생했어요')
    } finally {
      setIsPending(false)
    }
  }

  // TOTP 코드 검증
  async function handleVerifyTOTP() {
    setError('')
    setIsPending(true)

    try {
      const result = await twoFactor.verifyTotp({
        code: totpCode,
        fetchOptions: {
          onSuccess: () => {
            if (backupCodes.length > 0) {
              setStep('backup-codes')
            } else {
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
          onSuccess: () => {
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

  // 백업 코드 복사
  async function handleCopyCodes() {
    const codesText = backupCodes.join('\n')
    await navigator.clipboard.writeText(codesText)
    setCodesCopied(true)
    setTimeout(() => setCodesCopied(false), 2000)
  }

  // 백업 코드 다운로드
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
    setTotpPassword('')
    setTotpCode('')
    setError('')
  }

  // 로그아웃
  async function handleLogout() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/login'
        },
      },
    })
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

  // Step 1: MFA 방식 선택
  if (step === 'choose-method') {
    // 이미 패스키가 있는 경우
    if (hasExistingPasskey) {
      return (
        <div className="mt-6 flex flex-col gap-6">
          <div className="text-center flex flex-col gap-2">
            <div className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20">
              <Fingerprint className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-muted-foreground">이미 패스키가 등록되어 있어요!</p>
          </div>
          <Button className="w-full" disabled={isPending} onClick={completeOnboarding} variant="glass">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              '설정 완료'
            )}
          </Button>
        </div>
      )
    }

    // 소셜 사용자: 패스키만
    if (isSocialUser) {
      return (
        <div className="mt-6 flex flex-col gap-6">
          <p className="text-sm text-center text-muted-foreground">소셜 계정 보안 강화를 위해 패스키를 등록해주세요</p>

          <Button
            className="w-full h-auto py-4"
            disabled={isPending}
            onClick={handleSelectPasskey}
            variant="glass-outline"
          >
            <div className="flex items-center gap-3 w-full">
              <Fingerprint className="h-8 w-8 text-foreground" />
              <div className="text-left">
                <div className="font-medium">패스키 등록</div>
                <div className="text-xs text-muted-foreground">생체 인식으로 빠르고 안전하게</div>
              </div>
            </div>
          </Button>

          {error && <div className="text-sm text-destructive text-center">{error}</div>}

          <Button className="w-full" disabled={isPending} onClick={handleLogout} variant="glass-outline">
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      )
    }

    // 비밀번호 사용자: TOTP 또는 패스키
    return (
      <div className="mt-6 flex flex-col gap-6">
        <Button
          className="w-full h-auto py-4"
          disabled={isPending}
          onClick={handleSelectPasskey}
          variant="glass-outline"
        >
          <div className="flex items-center gap-3 w-full">
            <Fingerprint className="h-8 w-8 text-foreground" />
            <div className="text-left">
              <div className="font-medium">패스키 (권장)</div>
              <div className="text-xs text-muted-foreground">생체 인식으로 빠르고 안전하게</div>
            </div>
          </div>
        </Button>

        <Button className="w-full h-auto py-4" disabled={isPending} onClick={handleSelectTOTP} variant="glass-outline">
          <div className="flex items-center gap-3 w-full">
            <Smartphone className="h-8 w-8 text-foreground" />
            <div className="text-left">
              <div className="font-medium">인증 앱 (TOTP)</div>
              <div className="text-xs text-muted-foreground">Google Authenticator 등 사용</div>
            </div>
          </div>
        </Button>

        {error && <div className="text-sm text-destructive text-center">{error}</div>}

        <Button className="w-full" disabled={isPending} onClick={handleLogout} variant="glass-outline">
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </Button>
      </div>
    )
  }

  // Step 2: 비밀번호 입력 (TOTP 활성화용)
  if (step === 'enter-password') {
    return (
      <div className="mt-6 flex flex-col gap-6">
        <div className="text-center">
          <button className="text-xs text-foreground/70 hover:text-foreground hover:underline" onClick={handleBack} type="button">
            ← 다른 방식 선택
          </button>
        </div>

        <p className="text-sm text-center text-muted-foreground">TOTP 설정을 위해 비밀번호를 입력해주세요</p>

        <div>
          <Label htmlFor="password">비밀번호</Label>
          <div className="relative mt-2">
            <Input
              autoComplete="current-password"
              autoFocus
              className="pr-10"
              disabled={isPending}
              id="password"
              onChange={(e) => setTotpPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              value={totpPassword}
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

        {error && <div className="text-sm text-destructive text-center">{error}</div>}

        <Button className="w-full" disabled={isPending || !totpPassword} onClick={handleEnableTOTP} variant="glass">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              확인 중...
            </>
          ) : (
            '다음'
          )}
        </Button>
      </div>
    )
  }

  // Step 3a: TOTP 설정 (QR 코드)
  if (step === 'totp-setup') {
    return (
      <div className="mt-6 flex flex-col gap-6">
        <div className="text-center">
          <button className="text-xs text-foreground/70 hover:text-foreground hover:underline" onClick={handleBack} type="button">
            ← 다른 방식 선택
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">인증 앱에서 QR 코드를 스캔하세요</p>
          {totpUri && (
            <div className="flex justify-center">
              <div className="rounded-lg bg-white p-3 shadow-lg">
                <QRCodeSVG size={180} value={totpUri} />
              </div>
            </div>
          )}
          {totpUri && (
            <p className="text-xs text-muted-foreground mt-3">
              또는 수동 입력: <code className="glass-button px-2 py-0.5 rounded text-xs">{extractSecret(totpUri)}</code>
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
            variant="glass"
          />
        </div>

        {error && <div className="text-sm text-destructive text-center">{error}</div>}

        <Button className="w-full" disabled={isPending || totpCode.length !== 6} onClick={handleVerifyTOTP} variant="glass">
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
    )
  }

  // Step 3b: 패스키 설정
  if (step === 'passkey-setup') {
    return (
      <div className="mt-6 flex flex-col gap-6">
        {!isSocialUser && (
          <div className="text-center">
            <button className="text-xs text-foreground/70 hover:text-foreground hover:underline" onClick={handleBack} type="button">
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

        {error && <div className="text-sm text-destructive text-center">{error}</div>}

        <Button className="w-full" disabled={isPending} onClick={handlePasskeySetup} variant="glass">
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
    )
  }

  // Step 4: 백업 코드 확인
  if (step === 'backup-codes') {
    return (
      <div className="mt-6 flex flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-4">
            <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-medium">2차 인증 설정 완료!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            아래 복구 코드를 안전한 곳에 보관하세요.
            <br />
            인증 수단을 분실했을 때 필요합니다.
          </p>
        </div>

        <div className="glass-button rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div className="glass-input px-2 py-1.5 rounded text-center" key={index}>
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleCopyCodes} variant="glass-outline">
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
          <Button className="flex-1" onClick={handleDownloadCodes} variant="glass-outline">
            <Download className="mr-2 h-4 w-4" />
            다운로드
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={codesConfirmed}
            className="glass-checkbox"
            id="codesConfirmed"
            onCheckedChange={(checked) => setCodesConfirmed(checked === true)}
          />
          <Label className="cursor-pointer font-normal text-sm" htmlFor="codesConfirmed">
            복구 코드를 안전하게 보관했습니다
          </Label>
        </div>

        {error && <div className="text-sm text-destructive text-center">{error}</div>}

        <Button className="w-full" disabled={!codesConfirmed || isPending} onClick={completeOnboarding} variant="glass">
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
    )
  }

  return null
}

