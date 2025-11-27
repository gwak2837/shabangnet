'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  type DuplicateCheckPeriod,
  type DuplicateCheckSettings,
  duplicateCheckSettings as initialSettings,
} from '@/lib/mock-data'
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

export function DuplicateCheckForm() {
  const [settings, setSettings] = useState<DuplicateCheckSettings>(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    setSaved(false)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSaving(false)
    setSaved(true)

    // Hide saved message after 3 seconds
    setTimeout(() => setSaved(false), 3000)
  }

  const periodOptions: { value: DuplicateCheckPeriod; label: string }[] = [
    { value: 10, label: '10일' },
    { value: 15, label: '15일' },
    { value: 20, label: '20일' },
    { value: 30, label: '30일' },
  ]

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">중복 발주 방지</CardTitle>
            <CardDescription>동일 제조사 + 동일 주소로 발송 이력이 있으면 경고합니다</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="duplicate-check-enabled" className="text-base">
              중복 발주 체크 활성화
            </Label>
            <p className="text-sm text-slate-500">
              발송 시 동일 제조사 + 동일 수취인 주소로 최근 발송 이력을 체크합니다
            </p>
          </div>
          <Switch
            id="duplicate-check-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </div>

        {/* Period Selection */}
        <div className="space-y-3">
          <Label htmlFor="duplicate-check-period">중복 체크 기간</Label>
          <Select
            value={settings.periodDays.toString()}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                periodDays: parseInt(value) as DuplicateCheckPeriod,
              })
            }
            disabled={!settings.enabled}
          >
            <SelectTrigger id="duplicate-check-period" className="w-full">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-slate-500">
            선택한 기간 내에 동일 제조사 + 동일 주소로 발송된 이력이 있으면 경고가 표시됩니다
          </p>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">중복 감지 시 동작</p>
            <p className="mt-1">
              중복이 감지되면 발송 사유를 필수로 입력해야 합니다. 입력한 사유는 발송 로그에 기록되어 추후 추적이
              가능합니다.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              저장되었습니다
            </span>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800">
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
      </CardContent>
    </Card>
  )
}
