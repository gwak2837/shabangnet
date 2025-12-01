'use client'

import { KeyRound, Shield, Smartphone } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

import {
  getPasskeyAuthenticationOptions,
  validateRecoveryCodeAction,
  validateTotp,
  verifyPasskeyAuthentication,
} from './actions'

interface MfaChallengeProps {
  isAdmin: boolean
  mfaRequired: MfaRequired
  mfaSteps: MfaSteps
}

interface MfaRequired {
  passkey: boolean
  totp: boolean
}

interface MfaSteps {
  passkey: boolean
  primary: boolean
  totp: boolean
}

export function MfaChallenge({ isAdmin, mfaRequired, mfaSteps }: MfaChallengeProps) {
  const router = useRouter()
  const { update } = useSession()
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'passkey' | 'totp' | null>(null)

  // 필요한 MFA 단계
  const needsTotp = mfaRequired.totp && !mfaSteps.totp
  const needsPasskey = mfaRequired.passkey && !mfaSteps.passkey

  // 관리자: 순차적으로 모든 MFA 완료 필요 (TOTP 먼저, 그 다음 패스키)
  // 일반 사용자: 원하는 방식 하나만 선택해서 완료
  const getCurrentStep = (): 'complete' | 'passkey' | 'select' | 'totp' => {
    if (isAdmin) {
      // 관리자는 모든 MFA 순차 완료
      if (needsTotp) return 'totp'
      if (needsPasskey) return 'passkey'
      return 'complete'
    } else {
      // 일반 사용자는 선택 가능
      if (!needsTotp && !needsPasskey) return 'complete'
      // 하나만 필요하면 해당 방식으로
      if (needsTotp && !needsPasskey) return 'totp'
      if (needsPasskey && !needsTotp) return 'passkey'
      // 둘 다 있으면 선택하게
      return selectedMethod || 'select'
    }
  }

  const currentStep = getCurrentStep()

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await validateTotp(totpCode)

      if (!result.success) {
        setError(result.error || 'TOTP 인증에 실패했습니다.')
        setIsLoading(false)
        return
      }

      // 세션 업데이트하여 MFA 단계 완료 표시
      await update({
        mfaSteps: {
          ...mfaSteps,
          totp: true,
        },
      })

      // 다음 단계가 있으면 리로드, 없으면 대시보드로
      router.refresh()
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasskeyAuth = async () => {
    setError('')
    setIsLoading(true)

    try {
      // 패스키 인증 옵션 가져오기
      const optionsResult = await getPasskeyAuthenticationOptions()

      if (!optionsResult.success || !optionsResult.options || !optionsResult.challengeId) {
        setError(optionsResult.error || '패스키 인증을 시작할 수 없습니다.')
        setIsLoading(false)
        return
      }

      // WebAuthn 인증 시작
      const { startAuthentication } = await import('@simplewebauthn/browser')
      const authResponse = await startAuthentication({ optionsJSON: optionsResult.options })

      // 인증 검증
      const verifyResult = await verifyPasskeyAuthentication(optionsResult.challengeId, authResponse)

      if (!verifyResult.success) {
        setError(verifyResult.error || '패스키 인증에 실패했습니다.')
        setIsLoading(false)
        return
      }

      // 세션 업데이트
      await update({
        mfaSteps: {
          ...mfaSteps,
          passkey: true,
        },
      })

      router.refresh()
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('패스키 인증이 취소되었습니다.')
      } else {
        setError('패스키 인증 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await validateRecoveryCodeAction(recoveryCode)

      if (!result.success) {
        setError(result.error || '복구 코드가 올바르지 않습니다.')
        setIsLoading(false)
        return
      }

      // 복구 코드로 인증 성공 시 현재 필요한 MFA 단계 모두 완료로 표시
      await update({
        mfaSteps: {
          primary: true,
          totp: true,
          passkey: true,
        },
      })

      router.refresh()
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  // 진행 상황 표시 (관리자용 - 등록된 MFA가 2개 이상일 때만)
  const renderProgressIndicator = () => {
    if (!isAdmin) return null
    if (!mfaRequired.totp || !mfaRequired.passkey) return null // 2개 이상일 때만 표시

    const steps = [
      { name: 'TOTP', done: mfaSteps.totp, current: currentStep === 'totp' },
      { name: '패스키', done: mfaSteps.passkey, current: currentStep === 'passkey' },
    ]

    return (
      <div className="mb-6">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => (
            <div className="flex items-center" key={step.name}>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step.done
                    ? 'bg-green-500 text-white'
                    : step.current
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.done ? '✓' : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`mx-2 h-0.5 w-8 ${step.done ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-6 text-xs text-muted-foreground">
          {steps.map((step) => (
            <span className={step.current ? 'text-foreground font-medium' : ''} key={step.name}>
              {step.name}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // 일반 사용자용 방식 선택 UI
  const renderMethodSelection = () => {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">인증 방식을 선택해주세요</p>
        <div className="grid gap-3">
          <Button className="h-auto py-4 justify-start" onClick={() => setSelectedMethod('totp')} variant="outline">
            <Smartphone className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">인증 앱 (TOTP)</div>
              <div className="text-xs text-muted-foreground">Google Authenticator 등의 앱으로 인증</div>
            </div>
          </Button>
          <Button className="h-auto py-4 justify-start" onClick={() => setSelectedMethod('passkey')} variant="outline">
            <Shield className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">패스키</div>
              <div className="text-xs text-muted-foreground">생체 인증 또는 보안 키로 인증</div>
            </div>
          </Button>
        </div>
      </div>
    )
  }

  if (showRecovery) {
    return (
      <div className="mt-6 space-y-6">
        <div className="text-center">
          <KeyRound className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">복구 코드 사용</h3>
          <p className="mt-2 text-sm text-muted-foreground">저장해 둔 복구 코드 중 하나를 입력해주세요.</p>
        </div>
        <form className="space-y-4" onSubmit={handleRecoverySubmit}>
          <div>
            <Label htmlFor="recoveryCode">복구 코드</Label>
            <Input
              autoComplete="off"
              className="mt-2 font-mono"
              id="recoveryCode"
              maxLength={9}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              value={recoveryCode}
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <Button className="w-full" disabled={isLoading || recoveryCode.length < 8} type="submit">
            {isLoading ? '확인 중...' : '확인'}
          </Button>
        </form>
        <Button
          className="w-full"
          onClick={() => {
            setShowRecovery(false)
            setError('')
          }}
          variant="ghost"
        >
          돌아가기
        </Button>
      </div>
    )
  }

  // 뒤로가기 버튼 (일반 사용자가 방식을 다시 선택할 때)
  const canGoBack = !isAdmin && selectedMethod && needsTotp && needsPasskey

  return (
    <div className="mt-6 space-y-6">
      {renderProgressIndicator()}

      {currentStep === 'select' && renderMethodSelection()}

      {currentStep === 'totp' && (
        <div className="space-y-6">
          <div className="text-center">
            <Smartphone className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">인증 앱 코드 입력</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Google Authenticator 또는 인증 앱에서 6자리 코드를 입력해주세요.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleTotpSubmit}>
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
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button className="w-full" disabled={isLoading || totpCode.length !== 6} type="submit">
              {isLoading ? '확인 중...' : '확인'}
            </Button>
          </form>
          {canGoBack && (
            <Button
              className="w-full"
              onClick={() => {
                setSelectedMethod(null)
                setTotpCode('')
                setError('')
              }}
              variant="ghost"
            >
              다른 방식으로 인증
            </Button>
          )}
        </div>
      )}

      {currentStep === 'passkey' && (
        <div className="space-y-6">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">패스키 인증</h3>
            <p className="mt-2 text-sm text-muted-foreground">등록된 패스키로 본인 인증을 완료해주세요.</p>
          </div>
          {error && <div className="text-sm text-destructive text-center">{error}</div>}
          <Button className="w-full" disabled={isLoading} onClick={handlePasskeyAuth}>
            {isLoading ? '인증 중...' : '패스키로 인증'}
          </Button>
          {canGoBack && (
            <Button
              className="w-full"
              onClick={() => {
                setSelectedMethod(null)
                setError('')
              }}
              variant="ghost"
            >
              다른 방식으로 인증
            </Button>
          )}
        </div>
      )}

      <Separator />

      <div className="text-center">
        <button
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          onClick={() => setShowRecovery(true)}
          type="button"
        >
          인증 수단을 사용할 수 없나요?
        </button>
      </div>
    </div>
  )
}
