'use client'

import { AppShell } from '@/components/layout'
import { CourierForm, DuplicateCheckForm, ExclusionForm, SMTPForm } from '@/components/settings'
import {
  useSmtpSettings,
  useUpdateSmtpSettings,
  useExclusionSettings,
  useUpdateExclusionSettings,
  useAddExclusionPattern,
  useRemoveExclusionPattern,
  useDuplicateCheckSettings,
  useUpdateDuplicateCheckSettings,
  useCourierMappings,
  useUpdateCourierMapping,
  useAddCourierMapping,
  useRemoveCourierMapping,
} from '@/hooks'
import { Loader2 } from 'lucide-react'

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
      <AppShell title="설정" description="시스템 설정을 관리합니다">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="설정" description="시스템 설정을 관리합니다">
      <div className="max-w-3xl space-y-6">
        <SMTPForm
          settings={smtpSettings}
          onSave={(data) => updateSmtpMutation.mutate(data)}
          isSaving={updateSmtpMutation.isPending}
        />
        <CourierForm
          mappings={courierMappings ?? []}
          onUpdate={(id, data) => updateCourierMappingMutation.mutate({ id, data })}
          onAdd={(data) => addCourierMappingMutation.mutate(data)}
          onRemove={(id) => removeCourierMappingMutation.mutate(id)}
          isSaving={updateCourierMappingMutation.isPending || addCourierMappingMutation.isPending}
        />
        <DuplicateCheckForm
          settings={duplicateCheckSettings}
          onSave={(data) => updateDuplicateCheckMutation.mutate(data)}
          isSaving={updateDuplicateCheckMutation.isPending}
        />
        <ExclusionForm
          settings={exclusionSettings}
          onUpdateSettings={(data) => updateExclusionMutation.mutate(data)}
          onAddPattern={(pattern) => addExclusionPatternMutation.mutate(pattern)}
          onRemovePattern={(id) => removeExclusionPatternMutation.mutate(id)}
          isSaving={updateExclusionMutation.isPending || addExclusionPatternMutation.isPending}
        />
      </div>
    </AppShell>
  )
}
