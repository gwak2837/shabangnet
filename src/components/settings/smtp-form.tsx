'use client'

import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, Server, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { SMTPSettingsDisplay } from './actions/smtp'

import { getSmtpSettingsAction, testSMTPConnectionAction, updateSmtpSettingsAction } from './actions/smtp'

interface SMTPFormData {
  fromName: string
  host: string
  password: string
  username: string
}

export function SMTPForm() {
  const [formData, setFormData] = useState<SMTPFormData>({
    host: '',
    username: '',
    password: '',
    fromName: '',
  })
  const [hasExistingPassword, setHasExistingPassword] = useState(false)
  const [maskedPassword, setMaskedPassword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'error' | 'success' | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setIsLoading(true)
    try {
      const result = await getSmtpSettingsAction()
      if (result.success && result.settings) {
        const settings: SMTPSettingsDisplay = result.settings
        setFormData({
          host: settings.host,
          username: settings.username,
          password: '',
          fromName: settings.fromName,
        })
        setHasExistingPassword(settings.hasPassword)
        setMaskedPassword(settings.maskedPassword)
      }
    } catch {
      // 로드 실패 시 기본값 유지
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)

    try {
      const result = await updateSmtpSettingsAction({
        host: formData.host,
        username: formData.username,
        password: formData.password || undefined,
        fromName: formData.fromName,
      })

      if (result.success) {
        await loadSettings()
        setFormData((prev) => ({ ...prev, password: '' }))
      } else {
        setSaveError(result.error || '저장에 실패했습니다.')
      }
    } catch {
      setSaveError('서버와 통신 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTest() {
    setIsTesting(true)
    setTestResult(null)
    setTestError(null)

    try {
      const result = await testSMTPConnectionAction()

      if (result.success) {
        setTestResult('success')
      } else {
        setTestResult('error')
        setTestError(result.error || '연결 테스트에 실패했습니다.')
      }
    } catch {
      setTestResult('error')
      setTestError('서버와 통신 중 오류가 발생했습니다.')
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
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
    <section className="glass-card p-0 overflow-hidden">
      <header className="px-6 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-blue-500/10 to-blue-600/5 ring-1 ring-blue-500/10">
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">SMTP 설정</h2>
            <p className="text-sm text-muted-foreground">이메일 발송을 위한 SMTP 서버를 설정합니다</p>
          </div>
        </div>
      </header>
      <div className="p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor="host">
              SMTP 서버 주소
            </Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                id="host"
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="smtp.gmail.com"
                value={formData.host}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor="port">
              포트
            </Label>
            <Input className="bg-muted/50" disabled id="port" readOnly value="587 (STARTTLS)" />
            <p className="text-xs text-muted-foreground">보안을 위해 587 포트로 고정됩니다</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor="username">
              사용자명 (이메일)
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                id="username"
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="your-email@gmail.com"
                type="email"
                value={formData.username}
              />
            </div>
            <p className="text-xs text-muted-foreground">발신자 이메일로도 사용됩니다</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor="password">
              비밀번호 (앱 비밀번호)
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                id="password"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={hasExistingPassword ? maskedPassword : '앱 비밀번호 입력'}
                type="password"
                value={formData.password}
              />
            </div>
            {hasExistingPassword && (
              <p className="text-xs text-muted-foreground">비밀번호를 변경하려면 새 비밀번호를 입력하세요</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium" htmlFor="from-name">
            발신자 이름
          </Label>
          <Input
            id="from-name"
            onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
            placeholder="(주)다온에프앤씨"
            value={formData.fromName}
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

        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 ring-1 ${
              testResult === 'success'
                ? 'bg-emerald-500/10 ring-emerald-500/20 text-emerald-600'
                : 'bg-destructive/10 ring-destructive/20 text-destructive'
            }`}
          >
            {testResult === 'success' ? (
              <>
                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                <span className="font-medium">연결 테스트 성공! SMTP 서버에 정상적으로 연결되었습니다.</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">연결 테스트 실패</span>
                  {testError && <p className="text-sm mt-1 opacity-80">{testError}</p>}
                </div>
              </>
            )}
          </div>
        )}

        {saveError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 ring-1 ring-destructive/20 text-destructive">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">저장 실패</span>
              <p className="text-sm mt-1 opacity-80">{saveError}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button disabled={isTesting || isSaving} onClick={handleTest} variant="outline">
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isTesting ? '테스트 중...' : '연결 테스트'}
          </Button>

          <Button disabled={isSaving || isTesting} onClick={handleSave}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </section>
  )
}
