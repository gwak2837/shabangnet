'use client'

import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, Server, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // 초기 설정 로드
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
        setSaved(true)
        await loadSettings()
        setFormData((prev) => ({ ...prev, password: '' }))
        setTimeout(() => setSaved(false), 3000)
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">SMTP 설정</CardTitle>
            <CardDescription>이메일 발송을 위한 SMTP 서버를 설정합니다</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Server Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP 서버 주소</Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                id="host"
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="smtp.gmail.com"
                value={formData.host}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">포트</Label>
            <Input className="bg-slate-50 text-slate-500" disabled id="port" readOnly value="587 (STARTTLS)" />
            <p className="text-xs text-slate-500">보안을 위해 587 포트로 고정됩니다</p>
          </div>
        </div>

        {/* Auth Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="username">사용자명 (이메일)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                id="username"
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="your-email@gmail.com"
                type="email"
                value={formData.username}
              />
            </div>
            <p className="text-xs text-slate-500">발신자 이메일로도 사용됩니다</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호 (앱 비밀번호)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
              <p className="text-xs text-slate-500">비밀번호를 변경하려면 새 비밀번호를 입력하세요</p>
            )}
          </div>
        </div>

        {/* From Name */}
        <div className="space-y-2">
          <Label htmlFor="fromName">발신자 이름</Label>
          <Input
            id="fromName"
            onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
            placeholder="(주)다온에프앤씨"
            value={formData.fromName}
          />
          <p className="text-xs text-slate-500">수신자에게 표시되는 발신자 이름입니다</p>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-emerald-800">보안 연결 활성화됨</p>
            <p className="text-xs text-emerald-700">
              모든 이메일은 TLS 암호화 연결(STARTTLS)을 통해 안전하게 발송됩니다.
            </p>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 ${
              testResult === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
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
                  {testError && <p className="text-sm mt-1 opacity-90">{testError}</p>}
                </div>
              </>
            )}
          </div>
        )}

        {/* Save Error */}
        {saveError && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-rose-700">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">저장 실패</span>
              <p className="text-sm mt-1 opacity-90">{saveError}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button disabled={isTesting || isSaving} onClick={handleTest} variant="outline">
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                테스트 중...
              </>
            ) : (
              '연결 테스트'
            )}
          </Button>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                저장되었습니다
              </span>
            )}
            <Button className="bg-slate-900 hover:bg-slate-800" disabled={isSaving || isTesting} onClick={handleSave}>
              {isSaving ? (
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
