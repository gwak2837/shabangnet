'use client'

import { AlertCircle, Bell, CheckCircle2, Loader2, Lock, Mail, Package, Server, ShieldCheck } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'

import type { SMTPAccountPurpose } from '@/lib/email/config'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SMTP_PURPOSE_LABELS } from '@/lib/email/config'

import type { SMTPAccountDisplay } from './actions/smtp-accounts'

import {
  getSmtpAccountByPurposeAction,
  testSmtpAccountConnectionAction,
  upsertSmtpAccountAction,
} from './actions/smtp-accounts'

interface LoadedState {
  account: SMTPAccountDisplay | null
  isLoading: boolean
  loadKey: number
}

interface SaveActionState {
  error: string | null
  success: boolean
}

interface TestState {
  error: string | null
  result: 'error' | 'success' | null
}

export function SmtpAccountCard({ purpose }: { purpose: SMTPAccountPurpose }) {
  const [loaded, setLoaded] = useState<LoadedState>({
    account: null,
    isLoading: true,
    loadKey: 0,
  })

  const [testState, setTestState] = useState<TestState>({
    result: null,
    error: null,
  })

  const [isTesting, startTestTransition] = useTransition()

  const boundSaveAction = saveSmtpAccountAction.bind(null, purpose)
  const [saveState, formAction, isSaving] = useActionState(boundSaveAction, {
    success: false,
    error: null,
  })

  async function loadSettings() {
    setLoaded((prev) => ({ ...prev, isLoading: true }))

    try {
      const result = await getSmtpAccountByPurposeAction(purpose)

      if (result.success) {
        setLoaded((prev) => ({
          account: result.account,
          isLoading: false,
          loadKey: prev.loadKey + 1,
        }))
      } else {
        setLoaded((prev) => ({ ...prev, isLoading: false }))
      }
    } catch {
      setLoaded((prev) => ({ ...prev, isLoading: false }))
    }
  }

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose])

  // 저장 성공 시 데이터 다시 로드
  useEffect(() => {
    if (saveState.success) {
      loadSettings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState.success])

  function handleTest() {
    startTestTransition(async () => {
      setTestState({ result: null, error: null })

      const result = await testSmtpAccountConnectionAction(purpose)

      if (result.success) {
        setTestState({ result: 'success', error: null })
      } else {
        setTestState({
          result: 'error',
          error: result.error || '연결 테스트에 실패했습니다.',
        })
      }
    })
  }

  const Icon = purpose === 'system' ? Bell : Package
  const account = loaded.account

  if (loaded.isLoading) {
    return (
      <section className="glass-card p-0 overflow-hidden">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">설정을 불러오는 중...</span>
        </div>
      </section>
    )
  }

  return (
    <section className="glass-card p-0 overflow-hidden" data-purpose={purpose}>
      <header className="px-6 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br ring-1 in-data-[purpose=system]:from-violet-500/10 in-data-[purpose=system]:to-violet-600/5 in-data-[purpose=system]:ring-violet-500/10 in-data-[purpose=order]:from-orange-500/10 in-data-[purpose=order]:to-orange-600/5 in-data-[purpose=order]:ring-orange-500/10">
            <Icon className="h-5 w-5 in-data-[purpose=system]:text-violet-500 in-data-[purpose=order]:text-orange-500" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{SMTP_PURPOSE_LABELS[purpose]}</h2>
            <p className="text-sm text-muted-foreground">
              {purpose === 'system'
                ? '인증 이메일, 비밀번호 재설정 등 시스템 알림을 발송합니다'
                : '제조사에게 발주서 이메일을 발송합니다'}
            </p>
          </div>
        </div>
      </header>
      <form action={formAction} className="p-6 space-y-5" key={loaded.loadKey}>
        <input name="name" type="hidden" value={SMTP_PURPOSE_LABELS[purpose]} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor={`${purpose}-host`}>
              SMTP 서버 주소
            </Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                defaultValue={account?.host ?? ''}
                id={`${purpose}-host`}
                name="host"
                placeholder="smtp.gmail.com"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor={`${purpose}-port`}>
              포트
            </Label>
            <Input className="bg-muted/50" disabled id={`${purpose}-port`} readOnly value="587 (STARTTLS)" />
            <p className="text-xs text-muted-foreground">보안을 위해 587 포트로 고정됩니다</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor={`${purpose}-username`}>
              사용자명 (이메일)
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                defaultValue={account?.username ?? ''}
                id={`${purpose}-username`}
                name="username"
                placeholder="your-email@gmail.com"
                required
                type="email"
              />
            </div>
            <p className="text-xs text-muted-foreground">발신자 이메일로도 사용됩니다</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor={`${purpose}-password`}>
              비밀번호 (앱 비밀번호)
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                id={`${purpose}-password`}
                name="password"
                placeholder={account?.hasPassword ? account.maskedPassword : '앱 비밀번호 입력'}
                required={!account?.hasPassword}
                type="password"
              />
            </div>
            {account?.hasPassword && (
              <p className="text-xs text-muted-foreground">비밀번호를 변경하려면 새 비밀번호를 입력하세요</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium" htmlFor={`${purpose}-from-name`}>
            발신자 이름
          </Label>
          <Input
            defaultValue={account?.fromName ?? ''}
            id={`${purpose}-from-name`}
            name="from-name"
            placeholder="(주)다온에프앤씨"
          />
          <p className="text-xs text-muted-foreground">수신자에게 표시되는 발신자 이름입니다</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-emerald-600">보안 연결 활성화됨</p>
              <p className="mt-0.5 text-emerald-500">
                모든 이메일은 TLS 암호화 연결(STARTTLS)을 통해 안전하게 발송됩니다.
              </p>
            </div>
          </div>
        </div>
        {testState.result && (
          <div
            className="flex items-start gap-2 rounded-lg p-3 ring-1 data-[result=success]:bg-emerald-500/10 data-[result=success]:ring-emerald-500/20 data-[result=success]:text-emerald-600 data-[result=error]:bg-destructive/10 data-[result=error]:ring-destructive/20 data-[result=error]:text-destructive"
            data-result={testState.result}
          >
            {testState.result === 'success' ? (
              <>
                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                <span className="font-medium">연결 테스트 성공! SMTP 서버에 정상적으로 연결되었습니다.</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">연결 테스트 실패</span>
                  {testState.error && <p className="text-sm mt-1 opacity-80">{testState.error}</p>}
                </div>
              </>
            )}
          </div>
        )}
        {saveState.error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 ring-1 ring-destructive/20 text-destructive">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">저장 실패</span>
              <p className="text-sm mt-1 opacity-80">{saveState.error}</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <Button disabled={isTesting || isSaving} onClick={handleTest} type="button" variant="outline">
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isTesting ? '테스트 중...' : '연결 테스트'}
          </Button>
          <Button disabled={isSaving || isTesting} type="submit">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </section>
  )
}

async function saveSmtpAccountAction(
  purpose: SMTPAccountPurpose,
  _prevState: SaveActionState,
  formData: FormData,
): Promise<SaveActionState> {
  const result = await upsertSmtpAccountAction({
    name: String(formData.get('name')),
    purpose,
    host: String(formData.get('host')),
    port: 587,
    username: String(formData.get('username')),
    password: String(formData.get('password')),
    fromName: String(formData.get('from-name')),
    enabled: true,
  })

  if (result.success) {
    return { success: true, error: null }
  }
  return { success: false, error: result.error || '저장에 실패했습니다.' }
}
