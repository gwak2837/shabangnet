'use client'

import { AlertCircle, Bell, CheckCircle2, Loader2, Lock, Mail, Package, Server, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { SMTPAccountPurpose } from '@/lib/email/config'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SMTP_PURPOSE_LABELS } from '@/lib/email/config'

import type { SMTPAccountDisplay, SMTPAccountFormData } from './actions/smtp-accounts'

import {
  getSmtpAccountByPurposeAction,
  testSmtpAccountConnectionAction,
  upsertSmtpAccountAction,
} from './actions/smtp-accounts'

interface AccountFormState {
  formData: SMTPAccountFormData
  hasExistingPassword: boolean
  isLoading: boolean
  isSaving: boolean
  isTesting: boolean
  maskedPassword: string
  saved: boolean
  saveError: string | null
  testError: string | null
  testResult: 'error' | 'success' | null
}

const defaultFormData = (purpose: SMTPAccountPurpose): SMTPAccountFormData => ({
  name: SMTP_PURPOSE_LABELS[purpose],
  purpose,
  host: '',
  port: 587,
  username: '',
  password: '',
  fromName: '',
  enabled: true,
})

export function SmtpAccountsForm() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <Mail className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">SMTP 설정</h2>
          <p className="text-sm text-slate-500">용도별로 다른 SMTP 계정을 설정할 수 있습니다</p>
        </div>
      </div>

      <SmtpAccountCard purpose="system" />
      <SmtpAccountCard purpose="order" />
    </div>
  )
}

function SmtpAccountCard({ purpose }: { purpose: SMTPAccountPurpose }) {
  const [state, setState] = useState<AccountFormState>({
    formData: defaultFormData(purpose),
    hasExistingPassword: false,
    maskedPassword: '',
    isLoading: true,
    isSaving: false,
    isTesting: false,
    testResult: null,
    testError: null,
    saved: false,
    saveError: null,
  })

  const loadSettings = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const result = await getSmtpAccountByPurposeAction(purpose)
      if (result.success && result.account) {
        const account: SMTPAccountDisplay = result.account
        setState((prev) => ({
          ...prev,
          formData: {
            name: account.name,
            purpose: account.purpose,
            host: account.host,
            port: account.port,
            username: account.username,
            password: '',
            fromName: account.fromName,
            enabled: account.enabled,
          },
          hasExistingPassword: account.hasPassword,
          maskedPassword: account.maskedPassword,
        }))
      }
    } catch {
      // 로드 실패 시 기본값 유지
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [purpose])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  async function handleSave() {
    setState((prev) => ({ ...prev, isSaving: true, saveError: null }))

    try {
      const result = await upsertSmtpAccountAction(state.formData)

      if (result.success) {
        setState((prev) => ({ ...prev, saved: true }))
        await loadSettings()
        setState((prev) => ({ ...prev, formData: { ...prev.formData, password: '' } }))
        setTimeout(() => setState((prev) => ({ ...prev, saved: false })), 3000)
      } else {
        setState((prev) => ({ ...prev, saveError: result.error || '저장에 실패했습니다.' }))
      }
    } catch {
      setState((prev) => ({ ...prev, saveError: '서버와 통신 중 오류가 발생했습니다.' }))
    } finally {
      setState((prev) => ({ ...prev, isSaving: false }))
    }
  }

  async function handleTest() {
    setState((prev) => ({ ...prev, isTesting: true, testResult: null, testError: null }))

    try {
      const result = await testSmtpAccountConnectionAction(purpose)

      if (result.success) {
        setState((prev) => ({ ...prev, testResult: 'success' }))
      } else {
        setState((prev) => ({
          ...prev,
          testResult: 'error',
          testError: result.error || '연결 테스트에 실패했습니다.',
        }))
      }
    } catch {
      setState((prev) => ({
        ...prev,
        testResult: 'error',
        testError: '서버와 통신 중 오류가 발생했습니다.',
      }))
    } finally {
      setState((prev) => ({ ...prev, isTesting: false }))
    }
  }

  const updateFormData = (updates: Partial<SMTPAccountFormData>) => {
    setState((prev) => ({ ...prev, formData: { ...prev.formData, ...updates } }))
  }

  const Icon = purpose === 'system' ? Bell : Package
  const iconBgColor = purpose === 'system' ? 'bg-violet-50' : 'bg-orange-50'
  const iconColor = purpose === 'system' ? 'text-violet-600' : 'text-orange-600'

  if (state.isLoading) {
    return (
      <Card className="border-slate-200 bg-card shadow-sm py-6">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">설정을 불러오는 중...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm py-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgColor}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <CardTitle className="text-lg">{SMTP_PURPOSE_LABELS[purpose]}</CardTitle>
            <CardDescription>
              {purpose === 'system'
                ? '인증 이메일, 비밀번호 재설정 등 시스템 알림을 발송합니다'
                : '제조사에게 발주서 이메일을 발송합니다'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Server Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${purpose}-host`}>SMTP 서버 주소</Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                id={`${purpose}-host`}
                onChange={(e) => updateFormData({ host: e.target.value })}
                placeholder="smtp.gmail.com"
                value={state.formData.host}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${purpose}-port`}>포트</Label>
            <Input
              className="bg-slate-50 text-slate-500"
              disabled
              id={`${purpose}-port`}
              readOnly
              value="587 (STARTTLS)"
            />
            <p className="text-xs text-slate-500">보안을 위해 587 포트로 고정됩니다</p>
          </div>
        </div>

        {/* Auth Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${purpose}-username`}>사용자명 (이메일)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                id={`${purpose}-username`}
                onChange={(e) => updateFormData({ username: e.target.value })}
                placeholder="your-email@gmail.com"
                type="email"
                value={state.formData.username}
              />
            </div>
            <p className="text-xs text-slate-500">발신자 이메일로도 사용됩니다</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${purpose}-password`}>비밀번호 (앱 비밀번호)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                id={`${purpose}-password`}
                onChange={(e) => updateFormData({ password: e.target.value })}
                placeholder={state.hasExistingPassword ? state.maskedPassword : '앱 비밀번호 입력'}
                type="password"
                value={state.formData.password}
              />
            </div>
            {state.hasExistingPassword && (
              <p className="text-xs text-slate-500">비밀번호를 변경하려면 새 비밀번호를 입력하세요</p>
            )}
          </div>
        </div>

        {/* From Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${purpose}-fromName`}>발신자 이름</Label>
          <Input
            id={`${purpose}-fromName`}
            onChange={(e) => updateFormData({ fromName: e.target.value })}
            placeholder="(주)다온에프앤씨"
            value={state.formData.fromName}
          />
          <p className="text-xs text-slate-500">수신자에게 표시되는 발신자 이름입니다</p>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-emerald-800">보안 연결 활성화됨</p>
            <p className="text-xs text-emerald-700">
              모든 이메일은 TLS 암호화 연결(STARTTLS)을 통해 안전하게 발송됩니다.
            </p>
          </div>
        </div>

        {/* Test Result */}
        {state.testResult && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 ${
              state.testResult === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {state.testResult === 'success' ? (
              <>
                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                <span className="font-medium">연결 테스트 성공! SMTP 서버에 정상적으로 연결되었습니다.</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">연결 테스트 실패</span>
                  {state.testError && <p className="text-sm mt-1 opacity-90">{state.testError}</p>}
                </div>
              </>
            )}
          </div>
        )}

        {/* Save Error */}
        {state.saveError && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-rose-700">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">저장 실패</span>
              <p className="text-sm mt-1 opacity-90">{state.saveError}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button disabled={state.isTesting || state.isSaving} onClick={handleTest} variant="outline">
            {state.isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                테스트 중...
              </>
            ) : (
              '연결 테스트'
            )}
          </Button>

          <div className="flex items-center gap-3">
            {state.saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                저장되었습니다
              </span>
            )}
            <Button
              className="bg-slate-900 hover:bg-slate-800"
              disabled={state.isSaving || state.isTesting}
              onClick={handleSave}
            >
              {state.isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '설정 저장'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
