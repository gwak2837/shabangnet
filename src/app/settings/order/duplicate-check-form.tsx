'use client'

import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import type { DuplicateCheckPeriod, DuplicateCheckSettings } from '@/services/settings'

import { queryKeys } from '@/common/constants/query-keys'
import { SettingsIconBadge } from '@/components/settings/settings-icon-badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useServerAction } from '@/hooks/use-server-action'
import { useDuplicateCheckSettings } from '@/hooks/use-settings'

import { updateDuplicateCheckSettings } from './action'

const periodOptions: { label: string; value: DuplicateCheckPeriod }[] = [
  { value: 10, label: '10일' },
  { value: 15, label: '15일' },
  { value: 20, label: '20일' },
  { value: 30, label: '30일' },
]

export function DuplicateCheckForm() {
  const { data: settings = {} as DuplicateCheckSettings, isLoading } = useDuplicateCheckSettings()

  const [, updateSettings] = useServerAction(updateDuplicateCheckSettings, {
    invalidateKeys: [queryKeys.settings.duplicateCheck],
    onSuccess: () => toast.success('설정이 저장됐어요'),
  })

  return (
    <section className="rounded-xl border border-slate-200 bg-card p-0 shadow-sm overflow-hidden">
      <header className="px-6 pt-6">
        <div className="flex items-center gap-4">
          <SettingsIconBadge accent="amber" className="h-10 w-10" icon={ShieldCheck} />
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">중복 발주 방지</h2>
            <p className="text-sm text-muted-foreground">동일 제조사 + 동일 주소로 발송 이력이 있으면 경고합니다</p>
          </div>
        </div>
      </header>
      <div className="p-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 cursor-pointer">
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-medium">중복 체크 사용</span>
                <p className="text-sm text-muted-foreground">
                  동일 제조사 + 동일 수취인 주소로 최근 발송 이력을 체크합니다
                </p>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={(checked) => updateSettings({ enabled: checked })} />
            </label>
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="duplicate-check-period">
                체크 기간
              </Label>
              <Select
                disabled={!settings.enabled}
                onValueChange={(value) => updateSettings({ periodDays: parseInt(value, 10) as DuplicateCheckPeriod })}
                value={settings.periodDays.toString()}
              >
                <SelectTrigger
                  aria-disabled={!settings.enabled}
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
              <p className="text-sm text-muted-foreground">
                선택한 기간 내에 동일 조건으로 발송 이력이 있으면 경고합니다
              </p>
            </div>
          </>
        )}
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
      </div>
    </section>
  )
}
