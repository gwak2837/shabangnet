'use client'

import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, Server } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { SMTPSettings } from '@/lib/mock-data'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface SMTPFormProps {
  isSaving?: boolean
  onSave: (data: Partial<SMTPSettings>) => void
  settings?: SMTPSettings
}

export function SMTPForm({ settings, onSave, isSaving = false }: SMTPFormProps) {
  const [formData, setFormData] = useState<SMTPSettings>({
    host: '',
    port: 587,
    username: '',
    password: '',
    secure: true,
    fromName: '',
    fromEmail: '',
  })
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'error' | 'success' | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  async function handleSave() {
    onSave(formData)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleTest() {
    setIsTesting(true)
    setTestResult(null)
    setTestError(null)

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setTestResult('success')
      } else {
        setTestResult('error')
        setTestError(data.error || '연결 테스트에 실패했습니다.')
      }
    } catch {
      setTestResult('error')
      setTestError('서버와 통신 중 오류가 발생했습니다.')
    } finally {
      setIsTesting(false)
    }
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
            <Input
              id="port"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  port: parseInt(e.target.value) || 587,
                })
              }
              placeholder="587"
              type="number"
              value={formData.port}
            />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호 (앱 비밀번호)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                id="password"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••••••••••"
                type="password"
                value={formData.password}
              />
            </div>
          </div>
        </div>

        {/* From Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fromName">발신자 이름</Label>
            <Input
              id="fromName"
              onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
              placeholder="(주)다온에프앤씨"
              value={formData.fromName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromEmail">발신자 이메일</Label>
            <Input
              id="fromEmail"
              onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
              placeholder="daonfnc@gmail.com"
              type="email"
              value={formData.fromEmail}
            />
          </div>
        </div>

        {/* Security */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div className="space-y-0.5">
            <Label className="text-base" htmlFor="secure">
              보안 연결 (TLS/SSL)
            </Label>
            <p className="text-sm text-slate-500">대부분의 이메일 서비스에서 권장됩니다</p>
          </div>
          <Switch
            checked={formData.secure}
            id="secure"
            onCheckedChange={(checked) => setFormData({ ...formData, secure: checked })}
          />
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
                <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="font-medium">연결 테스트 성공! SMTP 서버에 정상적으로 연결되었습니다.</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">연결 테스트 실패</span>
                  {testError && <p className="text-sm mt-1 opacity-90">{testError}</p>}
                </div>
              </>
            )}
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
