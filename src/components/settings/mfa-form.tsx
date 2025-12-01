'use client'

import { AlertTriangle, CheckCircle2, Key, Loader2, Shield, Smartphone, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

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

import {
  deletePasskeyAction,
  disableTotpAction,
  generateRecoveryCodesAction,
  getPasskeyRegistrationOptions,
  setupTotp,
  verifyPasskeyRegistration,
  verifyTotpSetup,
} from './actions/mfa'

interface MfaFormProps {
  settings?: MfaSettings
}

interface MfaSettings {
  passkeys: { createdAt: string; id: string; lastUsedAt: string | null; name: string | null }[]
  recoveryCodesRemaining: number
  totpEnabled: boolean
}

export function MfaForm({ settings }: MfaFormProps) {
  const { update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // TOTP Setup State
  const [showTotpSetup, setShowTotpSetup] = useState(false)
  const [totpQrCode, setTotpQrCode] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  // Passkey State
  const [showPasskeySetup, setShowPasskeySetup] = useState(false)
  const [passkeyName, setPasskeyName] = useState('')

  // Recovery Codes State
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null)

  // Delete Confirmation
  const [deletePasskeyId, setDeletePasskeyId] = useState<string | null>(null)
  const [showDisableTotpDialog, setShowDisableTotpDialog] = useState(false)
  const [disableTotpCode, setDisableTotpCode] = useState('')

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // TOTP Setup
  const handleStartTotpSetup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await setupTotp()

      if (!result.success) {
        setError(result.error ?? null)
        return
      }

      setTotpQrCode(result.qrCode ?? null)
      setTotpSecret(result.secret ?? null)
      setShowTotpSetup(true)
    } catch {
      setError('TOTP 설정을 시작할 수 없습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyTotp = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await verifyTotpSetup(totpCode)

      if (!result.success) {
        setError(result.error ?? null)
        return
      }

      setRecoveryCodes(result.recoveryCodes ?? null)
      setSuccess('TOTP가 활성화되었습니다.')
      await update()
    } catch {
      setError('TOTP 인증에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableTotp = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await disableTotpAction(disableTotpCode)

      if (!result.success) {
        setError(result.error ?? null)
        return
      }

      setShowDisableTotpDialog(false)
      setDisableTotpCode('')
      setSuccess('TOTP가 비활성화되었습니다.')
      await update()
    } catch {
      setError('TOTP 비활성화에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // Passkey Setup
  const handleStartPasskeySetup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const optionsResult = await getPasskeyRegistrationOptions()

      if (!optionsResult.success || !optionsResult.options || !optionsResult.challengeId) {
        setError(optionsResult.error ?? null)
        return
      }

      const { startRegistration } = await import('@simplewebauthn/browser')
      const registration = await startRegistration({ optionsJSON: optionsResult.options })

      const verifyResult = await verifyPasskeyRegistration(
        optionsResult.challengeId,
        registration,
        passkeyName || undefined,
      )

      if (!verifyResult.success) {
        setError(verifyResult.error ?? null)
        return
      }

      if (verifyResult.recoveryCodes) {
        setRecoveryCodes(verifyResult.recoveryCodes)
      }

      setShowPasskeySetup(false)
      setPasskeyName('')
      setSuccess('패스키가 등록되었습니다.')
      await update()
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

  const handleDeletePasskey = async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await deletePasskeyAction(id)

      if (!result.success) {
        setError(result.error ?? null)
        return
      }

      setDeletePasskeyId(null)
      setSuccess('패스키가 삭제되었습니다.')
      await update()
    } catch {
      setError('패스키 삭제에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // Recovery Codes
  const handleRegenerateRecoveryCodes = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await generateRecoveryCodesAction()

      if (!result.success) {
        setError(result.error ?? null)
        return
      }

      setNewRecoveryCodes(result.codes ?? null)
      setSuccess('복구 코드가 재생성되었습니다.')
    } catch {
      setError('복구 코드 생성에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '사용 안 함'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

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
      <CardContent className="space-y-6">
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

        {/* TOTP Section */}
        <div className="space-y-4">
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
                <Button disabled={isLoading} onClick={handleStartTotpSetup} size="sm">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '설정'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Passkey Section */}
        <div className="space-y-4">
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
            <div className="space-y-2">
              {settings.passkeys.map((passkey) => (
                <div className="flex items-center justify-between rounded-md border p-3" key={passkey.id}>
                  <div>
                    <p className="font-medium">{passkey.name || '이름 없음'}</p>
                    <p className="text-xs text-muted-foreground">
                      등록: {formatDate(passkey.createdAt)} · 마지막 사용: {formatDate(passkey.lastUsedAt)}
                    </p>
                  </div>
                  <Button disabled={isLoading} onClick={() => setDeletePasskeyId(passkey.id)} size="sm" variant="ghost">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Recovery Codes Section */}
        <div className="space-y-4">
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
              disabled={isLoading || (!settings?.totpEnabled && !settings?.passkeys?.length)}
              onClick={() => setShowRecoveryCodes(true)}
              size="sm"
              variant="outline"
            >
              보기/재생성
            </Button>
          </div>
        </div>
      </CardContent>

      {/* TOTP Setup Dialog */}
      <Dialog onOpenChange={(open) => !open && setShowTotpSetup(false)} open={showTotpSetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>인증 앱 설정</DialogTitle>
            <DialogDescription>Google Authenticator 또는 다른 인증 앱으로 QR 코드를 스캔해주세요.</DialogDescription>
          </DialogHeader>
          {!recoveryCodes ? (
            <div className="space-y-4">
              {totpQrCode && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="TOTP QR Code" className="rounded-lg" height={200} src={totpQrCode} width={200} />
                </div>
              )}
              {totpSecret && (
                <div className="space-y-2">
                  <Label>수동 입력용 키</Label>
                  <code className="block rounded bg-muted p-2 text-center text-sm font-mono">{totpSecret}</code>
                </div>
              )}
              <div className="space-y-2">
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
            <div className="space-y-4">
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
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowTotpSetup(false)
                    setRecoveryCodes(null)
                    setTotpCode('')
                    setTotpQrCode(null)
                    setTotpSecret(null)
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
          <div className="space-y-4">
            <div className="space-y-2">
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
      <Dialog onOpenChange={(open) => !open && setShowRecoveryCodes(false)} open={showRecoveryCodes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>복구 코드</DialogTitle>
            <DialogDescription>새로운 복구 코드를 생성하면 기존 코드는 모두 무효화됩니다.</DialogDescription>
          </DialogHeader>
          {newRecoveryCodes ? (
            <div className="space-y-4">
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
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowRecoveryCodes(false)
                    setNewRecoveryCodes(null)
                    window.location.reload()
                  }}
                >
                  확인
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">남은 복구 코드: {settings?.recoveryCodesRemaining ?? 0}개</p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button disabled={isLoading} onClick={handleRegenerateRecoveryCodes} variant="destructive">
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
            <DialogDescription>보안을 위해 현재 인증 코드를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disableTotpCode">인증 코드</Label>
              <Input
                autoComplete="one-time-code"
                className="text-center text-lg tracking-widest"
                id="disableTotpCode"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setDisableTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                value={disableTotpCode}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                disabled={isLoading || disableTotpCode.length !== 6}
                onClick={handleDisableTotp}
                variant="destructive"
              >
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
    </Card>
  )
}
