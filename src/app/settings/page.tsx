'use client'

import { Loader2 } from 'lucide-react'

import { AppShell } from '@/components/layout'
import { CourierForm, DuplicateCheckForm, ExclusionForm, SMTPForm } from '@/components/settings'
import {
  useAddCourierMapping,
  useAddExclusionPattern,
  useCourierMappings,
  useDuplicateCheckSettings,
  useExclusionSettings,
  useRemoveCourierMapping,
  useRemoveExclusionPattern,
  useSmtpSettings,
  useUpdateCourierMapping,
  useUpdateDuplicateCheckSettings,
  useUpdateExclusionSettings,
  useUpdateSmtpSettings,
} from '@/hooks'

export default function SettingsPage() {
  // SMTP Settings
  const { data: smtpSettings, isLoading: isLoadingSmtp } = useSmtpSettings()
  const updateSmtpMutation = useUpdateSmtpSettings()

  // Exclusion Settings
  const { data: exclusionSettings, isLoading: isLoadingExclusion } = useExclusionSettings()
  const updateExclusionMutation = useUpdateExclusionSettings()
  const addExclusionPatternMutation = useAddExclusionPattern()
  const removeExclusionPatternMutation = useRemoveExclusionPattern()

  // Duplicate Check Settings
  const { data: duplicateCheckSettings, isLoading: isLoadingDuplicateCheck } = useDuplicateCheckSettings()
  const updateDuplicateCheckMutation = useUpdateDuplicateCheckSettings()

  // Courier Mappings
  const { data: courierMappings, isLoading: isLoadingCourier } = useCourierMappings()
  const updateCourierMappingMutation = useUpdateCourierMapping()
  const addCourierMappingMutation = useAddCourierMapping()
  const removeCourierMappingMutation = useRemoveCourierMapping()

  const isLoading = isLoadingSmtp || isLoadingExclusion || isLoadingDuplicateCheck || isLoadingCourier

  if (isLoading) {
    return (
      <AppShell description="시스템 설정을 관리합니다" title="설정">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="시스템 설정을 관리합니다" title="설정">
      <div className="max-w-3xl space-y-6">
        <SMTPForm
          isSaving={updateSmtpMutation.isPending}
          onSave={(data) => updateSmtpMutation.mutate(data)}
          settings={smtpSettings}
        />
        <CourierForm
          isSaving={updateCourierMappingMutation.isPending || addCourierMappingMutation.isPending}
          mappings={courierMappings ?? []}
          onAdd={(data) => addCourierMappingMutation.mutate(data)}
          onRemove={(id) => removeCourierMappingMutation.mutate(id)}
          onUpdate={(id, data) => updateCourierMappingMutation.mutate({ id, data })}
        />
        <DuplicateCheckForm
          isSaving={updateDuplicateCheckMutation.isPending}
          onSave={(data) => updateDuplicateCheckMutation.mutate(data)}
          settings={duplicateCheckSettings}
        />
        <ExclusionForm
          isSaving={updateExclusionMutation.isPending || addExclusionPatternMutation.isPending}
          onAddPattern={(pattern) => addExclusionPatternMutation.mutate(pattern)}
          onRemovePattern={(id) => removeExclusionPatternMutation.mutate(id)}
          onUpdateSettings={(data) => updateExclusionMutation.mutate(data)}
          settings={exclusionSettings}
        />
      </div>
    </AppShell>
  )
}
