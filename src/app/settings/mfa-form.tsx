'use client'

import { AlertTriangle, CheckCircle2, Copy, Key, KeyRound, Loader2, Shield, Smartphone, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { PasswordStrengthIndicator } from '@/app/(auth)/password-strength'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { formatRelativeTime } from '@/utils/format/date'
import { formatDateTime } from '@/utils/format/number'
import { getFirstPasswordError, validatePassword } from '@/utils/password'

import { setPasswordAction } from './actions/mfa'
import { SettingsIconBadge } from './settings-icon-badge'

interface MFAFormProps {
  settings?: MFASettings
}

interface MFASettings {
  hasPassword?: boolean
  passkeys: { createdAt: string; id: string; lastUsedAt: string | null; name: string | null }[]
  recoveryCodesRemaining: number
  totpEnabled: boolean
}

export function MFAForm({ settings }: MFAFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showTOTPSetup, setShowTOTPSetup] = useState(false)
  const [showTOTPPasswordDialog, setShowTOTPPasswordDialog] = useState(false)
  const [totpSetupPassword, setTOTPSetupPassword] = useState('')
  const [totpUri, setTOTPUri] = useState<string | null>(null)
  const [totpCode, setTOTPCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  const [showPasskeySetup, setShowPasskeySetup] = useState(false)
  const [passkeyName, setPasskeyName] = useState('')

  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null)
  const [recoveryPassword, setRecoveryPassword] = useState('')

  const [deletePasskeyId, setDeletePasskeyId] = useState<string | null>(null)
  const [showDisableTOTPDialog, setShowDisableTOTPDialog] = useState(false)
  const [disableTOTPCode, setDisableTOTPCode] = useState('')

  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)

  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedRecoveryCodes, setCopiedRecoveryCodes] = useState(false)

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  function generateQRCodeUrl(uri: string): string {
    return `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(uri)}&choe=UTF-8`
  }

  function extractSecret(uri: string): string {
    const match = uri.match(/secret=([A-Z2-7]+)/i)
    return match ? match[1] : ''
  }

  async function handleStartTOTPSetup() {
    if (!totpSetupPassword) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await authClient.twoFactor.enable({
        password: totpSetupPassword,
        fetchOptions: {
          onSuccess: (ctx) => {
            const data = ctx.data as { backupCodes?: string[]; totpURI?: string }
            if (data.totpURI) {
              setTOTPUri(data.totpURI)
              if (data.backupCodes) {
                setRecoveryCodes(data.backupCodes)
              }
              setShowTOTPPasswordDialog(false)
              setTOTPSetupPassword('')
              setShowTOTPSetup(true)
            }
          },
          onError: (ctx) => {
            setError(ctx.error.message || 'TOTP 설정에 실패했어요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || 'TOTP 설정을 시작할 수 없습니다.')
      }
    } catch {
      setError('TOTP 설정을 시작할 수 없습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyTOTP() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: totpCode,
        fetchOptions: {
          onSuccess: () => {
            setSuccess('TOTP가 활성화되었습니다.')
          },
          onError: (ctx) => {
            setError(ctx.error.message || 'TOTP 인증에 실패했어요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || 'TOTP 인증에 실패했습니다.')
      }
    } catch {
      setError('TOTP 인증에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDisableTOTP() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authClient.twoFactor.disable({
        password: disableTOTPCode,
        fetchOptions: {
          onSuccess: () => {
            setShowDisableTOTPDialog(false)
            setDisableTOTPCode('')
            setSuccess('TOTP가 비활성화되었습니다.')
            window.location.reload()
          },
          onError: (ctx) => {
            setError(ctx.error.message || 'TOTP 비활성화에 실패했어요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || 'TOTP 비활성화에 실패했습니다.')
      }
    } catch {
      setError('TOTP 비활성화에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleStartPasskeySetup() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authClient.passkey.addPasskey({
        name: passkeyName || undefined,
        fetchOptions: {
          onSuccess: () => {
            setShowPasskeySetup(false)
            setPasskeyName('')
            setSuccess('패스키가 등록되었습니다.')
            window.location.reload()
          },
          onError: (ctx) => {
            setError(ctx.error.message || '패스키 등록에 실패했어요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || '패스키 등록에 실패했습니다.')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('패스키 등록이 취소되었습니다.')
      } else {
        setError('패스키 등록에 실패했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeletePasskey(id: string) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authClient.passkey.deletePasskey({
        id,
        fetchOptions: {
          onSuccess: () => {
            setDeletePasskeyId(null)
            setSuccess('패스키가 삭제되었습니다.')
            window.location.reload()
          },
          onError: (ctx) => {
            setError(ctx.error.message || '패스키 삭제에 실패했어요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || '패스키 삭제에 실패했습니다.')
      }
    } catch {
      setError('패스키 삭제에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegenerateRecoveryCodes() {
    if (!recoveryPassword) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await authClient.twoFactor.generateBackupCodes({
        password: recoveryPassword,
        fetchOptions: {
          onSuccess: (ctx) => {
            const data = ctx.data as { backupCodes?: string[] }
            if (data.backupCodes) {
              setNewRecoveryCodes(data.backupCodes)
              setRecoveryPassword('')
              setSuccess('복구 코드가 재생성되었습니다.')
            }
          },
          onError: (ctx) => {
            setError(ctx.error.message || '복구 코드 생성에 실패했어요')
          },
        },
      })

      if (result.error) {
        setError(result.error.message || '복구 코드 생성에 실패했습니다.')
      }
    } catch {
      setError('복구 코드 생성에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetPassword() {
    if (!newPassword || !confirmPassword) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('password', newPassword)
      formData.append('confirmPassword', confirmPassword)

      const result = await setPasswordAction(formData)

      if (result.success) {
        setShowSetPasswordDialog(false)
        setNewPassword('')
        setConfirmPassword('')
        setPasswordTouched(false)
        setSuccess('비밀번호가 설정되었습니다.')
        window.location.reload()
      } else {
        setError(result.error || '비밀번호 설정에 실패했습니다.')
      }
    } catch {
      setError('비밀번호 설정에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopySecret = useCallback(async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } catch {
      setError('클립보드에 복사할 수 없습니다.')
    }
  }, [])

  const handleCopyRecoveryCodes = useCallback(async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopiedRecoveryCodes(true)
      setTimeout(() => setCopiedRecoveryCodes(false), 2000)
    } catch {
      setError('클립보드에 복사할 수 없습니다.')
    }
  }, [])

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-card p-0 shadow-sm overflow-hidden">
        <header className="px-6 pt-6">
          <div className="flex items-center gap-4">
            <SettingsIconBadge accent="emerald" className="h-10 w-10" icon={Shield} />
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">다중 인증 (MFA)</h2>
              <p className="text-sm text-muted-foreground">계정 보안을 강화하기 위한 추가 인증 수단을 설정합니다</p>
            </div>
          </div>
        </header>
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 ring-1 ring-destructive/20 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-500/20 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {settings?.hasPassword === false && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium text-foreground">비밀번호</h3>
                    <p className="text-sm text-muted-foreground">
                      패스키나 소셜 로그인 외에 비밀번호로도 로그인할 수 있어요
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-500 font-medium">미설정</span>
                  <Button disabled={isLoading} onClick={() => setShowSetPasswordDialog(true)} size="sm">
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    설정
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-500/20">
                <p className="text-sm text-amber-600">
                  <span className="font-medium">비밀번호가 없으면</span> TOTP 인증 앱이나 복구 코드 기능을 사용할 수
                  없어요.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium text-foreground">인증 앱 (TOTP)</h3>
                  <p className="text-sm text-muted-foreground">Google Authenticator 등의 앱으로 인증</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {settings?.totpEnabled ? (
                  <>
                    <span className="text-sm text-emerald-500 font-medium">활성화됨</span>
                    <Button
                      disabled={isLoading}
                      onClick={() => setShowDisableTOTPDialog(true)}
                      size="sm"
                      variant="outline"
                    >
                      비활성화
                    </Button>
                  </>
                ) : (
                  <Button
                    disabled={isLoading || settings?.hasPassword === false}
                    onClick={() => setShowTOTPPasswordDialog(true)}
                    size="sm"
                    title={settings?.hasPassword === false ? '비밀번호를 먼저 설정해주세요' : undefined}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    설정
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium text-foreground">패스키</h3>
                  <p className="text-sm text-muted-foreground">생체 인증 또는 보안 키로 인증</p>
                </div>
              </div>
              <Button disabled={isLoading} onClick={() => setShowPasskeySetup(true)} size="sm">
                추가
              </Button>
            </div>

            {settings?.passkeys && settings.passkeys.length > 0 && (
              <div className="space-y-2 pt-2">
                {settings.passkeys.map((pk) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-border/30"
                    key={pk.id}
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{pk.name || '이름 없음'}</p>
                      <p className="text-xs text-muted-foreground">
                        등록: <span title={formatDateTime(pk.createdAt)}>{formatRelativeTime(pk.createdAt)}</span> ·
                        마지막 사용:{' '}
                        <span title={pk.lastUsedAt ? formatDateTime(pk.lastUsedAt) : undefined}>
                          {pk.lastUsedAt ? formatRelativeTime(pk.lastUsedAt) : '사용 안 함'}
                        </span>
                      </p>
                    </div>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      disabled={isLoading}
                      onClick={() => setDeletePasskeyId(pk.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium text-foreground">복구 코드</h3>
                  <p className="text-sm text-muted-foreground">
                    인증 수단을 사용할 수 없을 때 사용
                    {settings?.recoveryCodesRemaining !== undefined && (
                      <span className="ml-2 text-amber-500">(남은 코드: {settings.recoveryCodesRemaining}개)</span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                disabled={
                  isLoading ||
                  settings?.hasPassword === false ||
                  (!settings?.totpEnabled && !settings?.passkeys?.length)
                }
                onClick={() => setShowRecoveryCodes(true)}
                size="sm"
                title={settings?.hasPassword === false ? '비밀번호를 먼저 설정해주세요' : undefined}
                variant="outline"
              >
                보기/재생성
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setShowTOTPPasswordDialog(false)
            setTOTPSetupPassword('')
            setError(null)
          }
        }}
        open={showTOTPPasswordDialog}
      >
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">비밀번호 확인</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              보안을 위해 비밀번호를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" htmlFor="totp-setup-password">
                비밀번호
              </Label>
              <Input
                autoComplete="current-password"
                id="totp-setup-password"
                onChange={(e) => setTOTPSetupPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && totpSetupPassword) {
                    handleStartTOTPSetup()
                  }
                }}
                type="password"
                value={totpSetupPassword}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t shrink-0">
            <div className="flex w-full gap-3">
              <Button className="flex-1" onClick={() => setShowTOTPPasswordDialog(false)} variant="outline">
                취소
              </Button>
              <Button className="flex-1" disabled={isLoading || !totpSetupPassword} onClick={handleStartTOTPSetup}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                확인
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && setShowTOTPSetup(false)} open={showTOTPSetup}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">인증 앱 설정</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Google Authenticator 또는 다른 인증 앱으로 QR 코드를 스캔해주세요.
            </DialogDescription>
          </DialogHeader>
          {!recoveryCodes ? (
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {totpUri && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="TOTP QR Code"
                    className="rounded-lg"
                    height={200}
                    src={generateQRCodeUrl(totpUri)}
                    width={200}
                  />
                </div>
              )}
              {totpUri && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">수동 입력용 키</Label>
                  <div className="relative group">
                    <code className="block rounded-lg bg-muted px-4 py-3 pr-12 text-center text-sm font-mono tracking-wider select-all ring-1 ring-border/50">
                      {extractSecret(totpUri)}
                    </code>
                    <button
                      aria-label="비밀키 복사"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all duration-200 hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopySecret(extractSecret(totpUri))}
                      type="button"
                    >
                      {copiedSecret ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {copiedSecret && (
                    <p className="text-xs text-emerald-500 text-center animate-in fade-in duration-200">
                      클립보드에 복사되었습니다
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" htmlFor="totp-verify-code">
                  인증 코드
                </Label>
                <Input
                  autoComplete="one-time-code"
                  className="text-center text-lg tracking-widest"
                  id="totp-verify-code"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => setTOTPCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  value={totpCode}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          ) : (
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-500/20">
                <p className="text-sm font-medium text-amber-600">복구 코드를 안전한 곳에 저장해주세요!</p>
                <p className="mt-1 text-xs text-amber-500/80">
                  인증 수단을 사용할 수 없을 때 이 코드로 로그인할 수 있습니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code, index) => (
                  <code
                    className="rounded-md bg-muted p-2 text-center text-sm font-mono ring-1 ring-border/50"
                    key={index}
                  >
                    {code}
                  </code>
                ))}
              </div>
              <button
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg ring-1 ring-border/50 bg-muted/50 hover:bg-muted transition-colors text-sm font-medium text-foreground"
                onClick={() => handleCopyRecoveryCodes(recoveryCodes)}
                type="button"
              >
                {copiedRecoveryCodes ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-500">복사 완료</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>모든 코드 복사</span>
                  </>
                )}
              </button>
            </div>
          )}
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t shrink-0">
            <div className="flex w-full gap-3">
              {!recoveryCodes ? (
                <>
                  <Button className="flex-1" onClick={() => setShowTOTPSetup(false)} variant="outline">
                    취소
                  </Button>
                  <Button className="flex-1" disabled={isLoading || totpCode.length !== 6} onClick={handleVerifyTOTP}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    확인
                  </Button>
                </>
              ) : (
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowTOTPSetup(false)
                    setRecoveryCodes(null)
                    setTOTPCode('')
                    setTOTPUri(null)
                    setCopiedRecoveryCodes(false)
                    window.location.reload()
                  }}
                >
                  확인
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && setShowPasskeySetup(false)} open={showPasskeySetup}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">패스키 추가</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              이 기기에 패스키를 등록합니다. 생체 인증 또는 PIN을 사용해 인증합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" htmlFor="passkey-name">
                패스키 이름 (선택)
              </Label>
              <Input
                id="passkey-name"
                onChange={(e) => setPasskeyName(e.target.value)}
                placeholder="예: MacBook Pro"
                value={passkeyName}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t shrink-0">
            <div className="flex w-full gap-3">
              <Button className="flex-1" onClick={() => setShowPasskeySetup(false)} variant="outline">
                취소
              </Button>
              <Button className="flex-1" disabled={isLoading} onClick={handleStartPasskeySetup}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                패스키 등록
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setShowRecoveryCodes(false)
            setRecoveryPassword('')
            setError(null)
          }
        }}
        open={showRecoveryCodes}
      >
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">복구 코드</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              새로운 복구 코드를 생성하면 기존 코드는 모두 무효화됩니다.
            </DialogDescription>
          </DialogHeader>
          {newRecoveryCodes ? (
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-500/20">
                <p className="text-sm font-medium text-amber-600">복구 코드를 안전한 곳에 저장해주세요!</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {newRecoveryCodes.map((code, index) => (
                  <code
                    className="rounded-md bg-muted p-2 text-center text-sm font-mono ring-1 ring-border/50"
                    key={index}
                  >
                    {code}
                  </code>
                ))}
              </div>
              <button
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg ring-1 ring-border/50 bg-muted/50 hover:bg-muted transition-colors text-sm font-medium text-foreground"
                onClick={() => handleCopyRecoveryCodes(newRecoveryCodes)}
                type="button"
              >
                {copiedRecoveryCodes ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-500">복사 완료</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>모든 코드 복사</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-muted-foreground">남은 복구 코드: {settings?.recoveryCodesRemaining ?? 0}개</p>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" htmlFor="recovery-password">
                  비밀번호
                </Label>
                <Input
                  autoComplete="current-password"
                  id="recovery-password"
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && recoveryPassword) {
                      handleRegenerateRecoveryCodes()
                    }
                  }}
                  placeholder="비밀번호를 입력하세요"
                  type="password"
                  value={recoveryPassword}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t shrink-0">
            <div className="flex w-full gap-3">
              {newRecoveryCodes ? (
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowRecoveryCodes(false)
                    setNewRecoveryCodes(null)
                    setCopiedRecoveryCodes(false)
                    window.location.reload()
                  }}
                >
                  확인
                </Button>
              ) : (
                <>
                  <Button className="flex-1" onClick={() => setShowRecoveryCodes(false)} variant="outline">
                    취소
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={isLoading || !recoveryPassword}
                    onClick={handleRegenerateRecoveryCodes}
                    variant="destructive"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    새로 생성
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && setShowDisableTOTPDialog(false)} open={showDisableTOTPDialog}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">TOTP 비활성화</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              보안을 위해 비밀번호를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" htmlFor="disable-totp-code">
                비밀번호
              </Label>
              <Input
                autoComplete="current-password"
                id="disable-totp-code"
                onChange={(e) => setDisableTOTPCode(e.target.value)}
                type="password"
                value={disableTOTPCode}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t shrink-0">
            <div className="flex w-full gap-3">
              <Button className="flex-1" onClick={() => setShowDisableTOTPDialog(false)} variant="outline">
                취소
              </Button>
              <Button
                className="flex-1"
                disabled={isLoading || !disableTOTPCode}
                onClick={handleDisableTOTP}
                variant="destructive"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                비활성화
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && setDeletePasskeyId(null)} open={!!deletePasskeyId}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">패스키 삭제</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              이 패스키를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t shrink-0">
            <div className="flex w-full gap-3">
              <Button
                className="flex-1"
                disabled={isLoading}
                onClick={() => setDeletePasskeyId(null)}
                variant="outline"
              >
                취소
              </Button>
              <Button
                className="flex-1"
                disabled={isLoading}
                onClick={() => deletePasskeyId && handleDeletePasskey(deletePasskeyId)}
                variant="destructive"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                삭제
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setShowSetPasswordDialog(false)
            setNewPassword('')
            setConfirmPassword('')
            setPasswordTouched(false)
            setError(null)
          }
        }}
        open={showSetPasswordDialog}
      >
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">비밀번호 설정</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              비밀번호를 설정하면 패스키나 소셜 로그인 외에 비밀번호로도 로그인할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" htmlFor="new-password">
                새 비밀번호
              </Label>
              <Input
                autoComplete="new-password"
                id="new-password"
                onBlur={() => setPasswordTouched(true)}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8자 이상, 대/소문자, 숫자 포함"
                type="password"
                value={newPassword}
              />
              {newPassword && (
                <PasswordStrengthIndicator
                  errorMessage={passwordTouched ? getFirstPasswordError(validatePassword(newPassword)) : undefined}
                  password={newPassword}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" htmlFor="confirm-password">
                비밀번호 확인
              </Label>
              <Input
                autoComplete="new-password"
                id="confirm-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPassword && confirmPassword) {
                    handleSetPassword()
                  }
                }}
                placeholder="비밀번호를 다시 입력하세요"
                type="password"
                value={confirmPassword}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">비밀번호가 일치하지 않아요</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t shrink-0">
            <div className="flex w-full gap-3">
              <Button className="flex-1" onClick={() => setShowSetPasswordDialog(false)} variant="outline">
                취소
              </Button>
              <Button
                className="flex-1"
                disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                onClick={handleSetPassword}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                비밀번호 설정
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
