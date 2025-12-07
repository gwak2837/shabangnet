'use client'

import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import type { DuplicateCheckPeriod, DuplicateCheckSettings } from '@/services/settings'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface DuplicateCheckFormProps {
  isSaving?: boolean
  onSave: (data: Partial<DuplicateCheckSettings>) => void
  settings?: DuplicateCheckSettings
}

const defaultSettings: DuplicateCheckSettings = {
  enabled: true,
  periodDays: 15,
}

const periodOptions: { label: string; value: DuplicateCheckPeriod }[] = [
  { value: 10, label: '10일' },
  { value: 15, label: '15일' },
  { value: 20, label: '20일' },
  { value: 30, label: '30일' },
]

export function DuplicateCheckForm({ settings, onSave, isSaving = false }: DuplicateCheckFormProps) {
  const [isEnabled, setIsEnabled] = useState(settings?.enabled ?? defaultSettings.enabled)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const enabled = formData.get('enabled') === 'on'
    const periodDays = parseInt(String(formData.get('period-days')), 10) as DuplicateCheckPeriod

    onSave({ enabled, periodDays })
  }

  return (
    <section className="glass-card p-0 overflow-hidden">
      <header className="px-6 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-amber-500/10 to-amber-600/5 ring-1 ring-amber-500/10">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">중복 발주 방지</h2>
            <p className="text-sm text-muted-foreground">동일 제조사 + 동일 주소로 발송 이력이 있으면 경고합니다</p>
          </div>
        </div>
      </header>
      <form className="p-6 space-y-5" onSubmit={handleSubmit}>
        <label className="glass-panel rounded-lg p-4 flex items-center justify-between cursor-pointer">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-medium">중복 체크 사용</span>
            <p className="text-sm text-muted-foreground">
              동일 제조사 + 동일 수취인 주소로 최근 발송 이력을 체크합니다
            </p>
          </div>
          <Switch
            defaultChecked={settings?.enabled ?? defaultSettings.enabled}
            name="enabled"
            onCheckedChange={setIsEnabled}
          />
        </label>
        <div className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="duplicate-check-period">
            체크 기간
          </Label>
          <Select
            defaultValue={(settings?.periodDays ?? defaultSettings.periodDays).toString()}
            disabled={!isEnabled}
            name="period-days"
          >
            <SelectTrigger
              aria-disabled={!isEnabled}
              className="w-full aria-disabled:opacity-50"
              id="duplicate-check-period"
            >
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
          <p className="text-sm text-muted-foreground">선택한 기간 내에 동일 조건으로 발송 이력이 있으면 경고합니다</p>
        </div>
        <div className="rounded-lg bg-amber-500/10 p-4 ring-1 ring-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-medium text-amber-600">중복 감지 시 동작</p>
              <p className="mt-1 text-amber-500">
                중복이 감지되면 발송 사유를 필수로 입력해야 합니다. 입력한 사유는 발송 로그에 기록됩니다.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '저장'}
          </Button>
        </div>
      </form>
    </section>
  )
}
