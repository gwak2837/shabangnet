'use client'

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Key,
  KeyRound,
  Loader2,
  Shield,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { PasswordStrengthIndicator } from '@/app/(auth)/password-strength'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import { authClient } from '@/lib/auth-client'
import { getFirstPasswordError, validatePassword } from '@/utils/password'

import { setPasswordAction } from './actions/mfa'

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

  // TOTP Setup State
  const [showTotpSetup, setShowTotpSetup] = useState(false)
  const [showTotpPasswordDialog, setShowTotpPasswordDialog] = useState(false)
  const [totpSetupPassword, setTotpSetupPassword] = useState('')
  const [totpUri, setTotpUri] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  // Passkey State
  const [showPasskeySetup, setShowPasskeySetup] = useState(false)
  const [passkeyName, setPasskeyName] = useState('')

  // Recovery Codes State
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null)
  const [recoveryPassword, setRecoveryPassword] = useState('')

  // Delete Confirmation
  const [deletePasskeyId, setDeletePasskeyId] = useState<string | null>(null)
  const [showDisableTotpDialog, setShowDisableTotpDialog] = useState(false)
  const [disableTotpCode, setDisableTotpCode] = useState('')

  // Password Setup State (for passwordless users)
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)

  // Copy State
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedRecoveryCodes, setCopiedRecoveryCodes] = useState(false)

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // QR 코드 이미지 생성 (totpUri에서)
  function generateQRCodeUrl(uri: string): string {
    return `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(uri)}&choe=UTF-8`
  }

  // totpUri에서 secret 추출
  function extractSecret(uri: string): string {
    const match = uri.match(/secret=([A-Z2-7]+)/i)
    return match ? match[1] : ''
  }

  // TOTP Setup
  async function handleStartTotpSetup() {
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
            const data = ctx.data as { totpURI?: string; backupCodes?: string[] }
            if (data.totpURI) {
              setTotpUri(data.totpURI)
              if (data.backupCodes) {
                setRecoveryCodes(data.backupCodes)
              }
              setShowTotpPasswordDialog(false)
              setTotpSetupPassword('')
              setShowTotpSetup(true)
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

  async function handleVerifyTotp() {
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

  async function handleDisableTotp() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authClient.twoFactor.disable({
        password: disableTotpCode,
        fetchOptions: {
          onSuccess: () => {
            setShowDisableTotpDialog(false)
            setDisableTotpCode('')
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

  // Passkey Setup
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

  // Recovery Codes
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

  // Password Setup (for passwordless users)
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

  function formatDate(dateString: string | null) {
    if (!dateString) return '사용 안 함'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
    <Card className="border-slate-200 bg-card shadow-sm py-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-lg">다중 인증 (MFA)</CardTitle>
            <CardDescription>계정 보안을 강화하기 위한 추가 인증 수단을 설정합니다</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* Password Setup Section (for passwordless users) */}
        {settings?.hasPassword === false && (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-slate-500" />
                  <div>
                    <h3 className="font-medium">비밀번호</h3>
                    <p className="text-sm text-muted-foreground">
                      패스키나 소셜 로그인 외에 비밀번호로도 로그인할 수 있어요
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-600 font-medium">미설정</span>
                  <Button disabled={isLoading} onClick={() => setShowSetPasswordDialog(true)} size="sm">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '설정'}
                  </Button>
                </div>
              </div>
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <p>
                  <strong>비밀번호가 없으면</strong> TOTP 인증 앱이나 복구 코드 기능을 사용할 수 없어요. 비밀번호를
                  설정하면 다양한 보안 기능을 사용할 수 있습니다.
                </p>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* TOTP Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-slate-500" />
              <div>
                <h3 className="font-medium">인증 앱 (TOTP)</h3>
                <p className="text-sm text-muted-foreground">Google Authenticator 등의 앱으로 인증</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {settings?.totpEnabled ? (
                <>
                  <span className="text-sm text-green-600 font-medium">활성화됨</span>
                  <Button
                    disabled={isLoading}
                    onClick={() => setShowDisableTotpDialog(true)}
                    size="sm"
                    variant="outline"
                  >
                    비활성화
                  </Button>
                </>
              ) : (
                <Button
                  disabled={isLoading || settings?.hasPassword === false}
                  onClick={() => setShowTotpPasswordDialog(true)}
                  size="sm"
                  title={settings?.hasPassword === false ? '비밀번호를 먼저 설정해주세요' : undefined}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '설정'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Passkey Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-slate-500" />
              <div>
                <h3 className="font-medium">패스키</h3>
                <p className="text-sm text-muted-foreground">생체 인증 또는 보안 키로 인증</p>
              </div>
            </div>
            <Button disabled={isLoading} onClick={() => setShowPasskeySetup(true)} size="sm">
              패스키 추가
            </Button>
          </div>

          {settings?.passkeys && settings.passkeys.length > 0 && (
            <div className="flex flex-col gap-2">
              {settings.passkeys.map((pk) => (
                <div className="flex items-center justify-between rounded-md border p-3" key={pk.id}>
                  <div>
                    <p className="font-medium">{pk.name || '이름 없음'}</p>
                    <p className="text-xs text-muted-foreground">
                      등록: {formatDate(pk.createdAt)} · 마지막 사용: {formatDate(pk.lastUsedAt)}
                    </p>
                  </div>
                  <Button disabled={isLoading} onClick={() => setDeletePasskeyId(pk.id)} size="sm" variant="ghost">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Recovery Codes Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-slate-500" />
              <div>
                <h3 className="font-medium">복구 코드</h3>
                <p className="text-sm text-muted-foreground">
                  인증 수단을 사용할 수 없을 때 사용
                  {settings?.recoveryCodesRemaining !== undefined && (
                    <span className="ml-2 text-amber-600">(남은 코드: {settings.recoveryCodesRemaining}개)</span>
                  )}
                </p>
              </div>
            </div>
            <Button
              disabled={
                isLoading || settings?.hasPassword === false || (!settings?.totpEnabled && !settings?.passkeys?.length)
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
      </CardContent>

      {/* TOTP Password Verification Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setShowTotpPasswordDialog(false)
            setTotpSetupPassword('')
            setError(null)
          }
        }}
        open={showTotpPasswordDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 확인</DialogTitle>
            <DialogDescription>보안을 위해 비밀번호를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="totpSetupPassword">비밀번호</Label>
              <Input
                autoComplete="current-password"
                id="totpSetupPassword"
                onChange={(e) => setTotpSetupPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && totpSetupPassword) {
                    handleStartTotpSetup()
                  }
                }}
                type="password"
                value={totpSetupPassword}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button disabled={isLoading || !totpSetupPassword} onClick={handleStartTotpSetup}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '확인'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* TOTP Setup Dialog */}
      <Dialog onOpenChange={(open) => !open && setShowTotpSetup(false)} open={showTotpSetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>인증 앱 설정</DialogTitle>
            <DialogDescription>Google Authenticator 또는 다른 인증 앱으로 QR 코드를 스캔해주세요.</DialogDescription>
          </DialogHeader>
          {!recoveryCodes ? (
            <div className="flex flex-col gap-4">
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
                <div className="flex flex-col gap-2">
                  <Label>수동 입력용 키</Label>
                  <div className="relative group">
                    <code className="block rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-3 pr-12 text-center text-sm font-mono tracking-wider select-all border border-slate-200 dark:border-slate-700">
                      {extractSecret(totpUri)}
                    </code>
                    <button
                      aria-label="비밀키 복사"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      onClick={() => handleCopySecret(extractSecret(totpUri))}
                      type="button"
                    >
                      {copiedSecret ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  {copiedSecret && (
                    <p className="text-xs text-green-600 text-center animate-in fade-in duration-200">
                      클립보드에 복사되었습니다
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="totpVerifyCode">인증 코드</Label>
                <Input
                  autoComplete="one-time-code"
                  className="text-center text-lg tracking-widest"
                  id="totpVerifyCode"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  value={totpCode}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button disabled={isLoading || totpCode.length !== 6} onClick={handleVerifyTotp}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '확인'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">복구 코드를 안전한 곳에 저장해주세요!</p>
                <p className="mt-1 text-xs">인증 수단을 사용할 수 없을 때 이 코드로 로그인할 수 있습니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code, index) => (
                  <code className="rounded bg-muted p-2 text-center text-sm font-mono" key={index}>
                    {code}
                  </code>
                ))}
              </div>
              <button
                className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
                onClick={() => handleCopyRecoveryCodes(recoveryCodes)}
                type="button"
              >
                {copiedRecoveryCodes ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">복사 완료</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>모든 코드 복사</span>
                  </>
                )}
              </button>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowTotpSetup(false)
                    setRecoveryCodes(null)
                    setTotpCode('')
                    setTotpUri(null)
                    setCopiedRecoveryCodes(false)
                    window.location.reload()
                  }}
                >
                  확인
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Passkey Setup Dialog */}
      <Dialog onOpenChange={(open) => !open && setShowPasskeySetup(false)} open={showPasskeySetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>패스키 추가</DialogTitle>
            <DialogDescription>
              이 기기에 패스키를 등록합니다. 생체 인증 또는 PIN을 사용해 인증합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="passkeyName">패스키 이름 (선택)</Label>
              <Input
                id="passkeyName"
                onChange={(e) => setPasskeyName(e.target.value)}
                placeholder="예: MacBook Pro"
                value={passkeyName}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button disabled={isLoading} onClick={handleStartPasskeySetup}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '패스키 등록'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recovery Codes Dialog */}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>복구 코드</DialogTitle>
            <DialogDescription>새로운 복구 코드를 생성하면 기존 코드는 모두 무효화됩니다.</DialogDescription>
          </DialogHeader>
          {newRecoveryCodes ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">복구 코드를 안전한 곳에 저장해주세요!</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {newRecoveryCodes.map((code, index) => (
                  <code className="rounded bg-muted p-2 text-center text-sm font-mono" key={index}>
                    {code}
                  </code>
                ))}
              </div>
              <button
                className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
                onClick={() => handleCopyRecoveryCodes(newRecoveryCodes)}
                type="button"
              >
                {copiedRecoveryCodes ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">복사 완료</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>모든 코드 복사</span>
                  </>
                )}
              </button>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowRecoveryCodes(false)
                    setNewRecoveryCodes(null)
                    setCopiedRecoveryCodes(false)
                    window.location.reload()
                  }}
                >
                  확인
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">남은 복구 코드: {settings?.recoveryCodesRemaining ?? 0}개</p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="recoveryPassword">비밀번호</Label>
                <Input
                  autoComplete="current-password"
                  id="recoveryPassword"
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
              <DialogFooter>
                <Button
                  disabled={isLoading || !recoveryPassword}
                  onClick={handleRegenerateRecoveryCodes}
                  variant="destructive"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '새로 생성'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable TOTP Dialog */}
      <Dialog onOpenChange={(open) => !open && setShowDisableTotpDialog(false)} open={showDisableTotpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>TOTP 비활성화</DialogTitle>
            <DialogDescription>보안을 위해 비밀번호를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="disableTotpCode">비밀번호</Label>
              <Input
                autoComplete="current-password"
                id="disableTotpCode"
                onChange={(e) => setDisableTotpCode(e.target.value)}
                type="password"
                value={disableTotpCode}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button disabled={isLoading || !disableTotpCode} onClick={handleDisableTotp} variant="destructive">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '비활성화'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Passkey Dialog */}
      <Dialog onOpenChange={(open) => !open && setDeletePasskeyId(null)} open={!!deletePasskeyId}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>패스키 삭제</DialogTitle>
            <DialogDescription>이 패스키를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button disabled={isLoading} onClick={() => setDeletePasskeyId(null)} variant="outline">
              취소
            </Button>
            <Button
              disabled={isLoading}
              onClick={() => deletePasskeyId && handleDeletePasskey(deletePasskeyId)}
              variant="destructive"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog (for passwordless users) */}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 설정</DialogTitle>
            <DialogDescription>
              비밀번호를 설정하면 패스키나 소셜 로그인 외에 비밀번호로도 로그인할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                autoComplete="new-password"
                id="newPassword"
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                autoComplete="new-password"
                id="confirmPassword"
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
            <DialogFooter>
              <Button
                disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                onClick={handleSetPassword}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '비밀번호 설정'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
