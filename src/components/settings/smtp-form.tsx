'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { type SMTPSettings, smtpSettings as initialSettings } from '@/lib/mock-data'
import { Mail, Server, Lock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

export function SMTPForm() {
  const [settings, setSettings] = useState<SMTPSettings>(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    setSaved(false)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSaving(false)
    setSaved(true)

    // Hide saved message after 3 seconds
    setTimeout(() => setSaved(false), 3000)
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)

    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate random success/failure for demo
    const success = Math.random() > 0.3
    setTestResult(success ? 'success' : 'error')
    setIsTesting(false)
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
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
                id="host"
                value={settings.host}
                onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">포트</Label>
            <Input
              id="port"
              type="number"
              value={settings.port}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  port: parseInt(e.target.value) || 587,
                })
              }
              placeholder="587"
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
                id="username"
                type="email"
                value={settings.username}
                onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                placeholder="your-email@gmail.com"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호 (앱 비밀번호)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type="password"
                value={settings.password}
                onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                placeholder="••••••••••••••••"
                className="pl-9"
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
              value={settings.fromName}
              onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
              placeholder="(주)다온에프앤씨"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromEmail">발신자 이메일</Label>
            <Input
              id="fromEmail"
              type="email"
              value={settings.fromEmail}
              onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
              placeholder="daonfnc@gmail.com"
            />
          </div>
        </div>

        {/* Security */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="secure" className="text-base">
              보안 연결 (TLS/SSL)
            </Label>
            <p className="text-sm text-slate-500">대부분의 이메일 서비스에서 권장됩니다</p>
          </div>
          <Switch
            id="secure"
            checked={settings.secure}
            onCheckedChange={(checked) => setSettings({ ...settings, secure: checked })}
          />
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 ${
              testResult === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {testResult === 'success' ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">연결 테스트 성공! SMTP 서버에 정상적으로 연결되었습니다.</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">연결 테스트 실패. 설정을 확인해주세요.</span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={handleTest} disabled={isTesting || isSaving}>
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
            <Button onClick={handleSave} disabled={isSaving || isTesting} className="bg-slate-900 hover:bg-slate-800">
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
