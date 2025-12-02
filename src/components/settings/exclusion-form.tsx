'use client'

import { CheckCircle2, Filter, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { ExclusionPattern, ExclusionSettings } from '@/services/settings'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface ExclusionFormProps {
  isSaving?: boolean
  onAddPattern: (pattern: Omit<ExclusionPattern, 'id'>) => void
  onRemovePattern: (id: string) => void
  onUpdateSettings: (data: Partial<ExclusionSettings>) => void
  settings?: ExclusionSettings
}

const defaultSettings: ExclusionSettings = {
  enabled: true,
  patterns: [],
}

export function ExclusionForm({
  settings,
  onUpdateSettings,
  onAddPattern,
  onRemovePattern,
  isSaving = false,
}: ExclusionFormProps) {
  const [formData, setFormData] = useState<ExclusionSettings>(settings ?? defaultSettings)
  const [newPattern, setNewPattern] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saved, setSaved] = useState(false)
  const [prevSettings, setPrevSettings] = useState(settings)
  const enabledCount = formData.patterns.filter((p) => p.enabled).length

  if (settings !== prevSettings) {
    setPrevSettings(settings)
    if (settings) {
      setFormData(settings)
    }
  }

  function handleToggleEnabled(checked: boolean) {
    setFormData({ ...formData, enabled: checked })
    onUpdateSettings({ enabled: checked })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleAddPattern() {
    if (!newPattern.trim()) return

    onAddPattern({
      pattern: newPattern.trim(),
      enabled: true,
      description: newDescription.trim() || undefined,
    })

    setNewPattern('')
    setNewDescription('')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleRemovePattern(id: string) {
    onRemovePattern(id)
  }

  function handleTogglePattern(id: string, enabled: boolean) {
    // Local update - in real app this would call onUpdatePattern
    setFormData({
      ...formData,
      patterns: formData.patterns.map((p) => (p.id === id ? { ...p, enabled } : p)),
    })
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm py-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
            <Filter className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <CardTitle className="text-lg">발송 제외 설정</CardTitle>
            <CardDescription>F열 값에 따라 이메일 발송 대상에서 제외할 패턴을 관리합니다</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div className="space-y-0.5">
            <Label className="text-base" htmlFor="exclusion-enabled">
              발송 제외 필터 활성화
            </Label>
            <p className="text-sm text-slate-500">F열 값이 아래 패턴과 일치하는 주문은 이메일 발송에서 제외됩니다</p>
          </div>
          <Switch checked={formData.enabled} id="exclusion-enabled" onCheckedChange={handleToggleEnabled} />
        </div>

        {/* Patterns List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>제외 패턴 목록</Label>
            <Badge className="bg-slate-100 text-slate-600" variant="secondary">
              {enabledCount}/{formData.patterns.length} 활성화
            </Badge>
          </div>

          <div className="space-y-2">
            {formData.patterns.map((pattern) => (
              <div
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  pattern.enabled ? 'border-slate-200 bg-card' : 'border-slate-100 bg-slate-50'
                }`}
                key={pattern.id}
              >
                <Switch
                  checked={pattern.enabled}
                  disabled={!formData.enabled}
                  onCheckedChange={(checked) => handleTogglePattern(pattern.id, checked)}
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-mono text-sm truncate ${pattern.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                    {pattern.pattern}
                  </p>
                  {pattern.description && <p className="text-xs text-slate-500 truncate">{pattern.description}</p>}
                </div>
                <Button
                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                  onClick={() => handleRemovePattern(pattern.id)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {formData.patterns.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm text-slate-500">등록된 제외 패턴이 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Add New Pattern */}
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Label>새 패턴 추가</Label>
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Input
                className="bg-card font-mono text-sm"
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="예: [30002002]주문_센터택배"
                value={newPattern}
              />
              <Input
                className="bg-card text-sm"
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="설명 (선택사항)"
                value={newDescription}
              />
            </div>
            <Button
              className="shrink-0 bg-violet-600 hover:bg-violet-700"
              disabled={!newPattern.trim() || isSaving}
              onClick={handleAddPattern}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              추가
            </Button>
          </div>
          <p className="text-xs text-slate-500">F열 값에 입력한 패턴이 포함되어 있으면 발송 제외 대상으로 분류됩니다</p>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
          <Filter className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          <div className="text-sm text-violet-800">
            <p className="font-medium">발송 제외 동작</p>
            <p className="mt-1">
              제외된 주문은 주문 페이지의 &quot;발송제외&quot; 탭에서 별도로 확인할 수 있습니다. 이메일 발송 배치에는
              포함되지 않습니다.
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
        </div>
      </CardContent>
    </Card>
  )
}
