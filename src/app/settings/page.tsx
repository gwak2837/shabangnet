'use client'

import { Loader2 } from 'lucide-react'

import { AppShell } from '@/components/layout/app-shell'
import { CourierForm } from '@/components/settings/courier-form'
import { DuplicateCheckForm } from '@/components/settings/duplicate-check-form'
import { EmailVerificationForm } from '@/components/settings/email-verification-form'
import { ExclusionForm } from '@/components/settings/exclusion-form'
import { MfaForm } from '@/components/settings/mfa-form'
import { ShoppingMallForm } from '@/components/settings/shopping-mall-form'
import { SMTPForm } from '@/components/settings/smtp-form'
import {
  useAddCourierMapping,
  useAddExclusionPattern,
  useAnalyzeShoppingMallFile,
  useCourierMappings,
  useCreateShoppingMallTemplate,
  useDeleteShoppingMallTemplate,
  useDuplicateCheckSettings,
  useExclusionSettings,
  useMfaSettings,
  useRemoveCourierMapping,
  useRemoveExclusionPattern,
  useShoppingMallTemplates,
  useUpdateCourierMapping,
  useUpdateDuplicateCheckSettings,
  useUpdateExclusionSettings,
  useUpdateShoppingMallTemplate,
} from '@/hooks/use-settings'

export default function SettingsPage() {
  // MFA Settings
  const { data: mfaSettings, isLoading: isLoadingMfa } = useMfaSettings()

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

  // Shopping Mall Templates
  const { data: shoppingMallTemplates, isLoading: isLoadingShoppingMall } = useShoppingMallTemplates()
  const createShoppingMallTemplateMutation = useCreateShoppingMallTemplate()
  const updateShoppingMallTemplateMutation = useUpdateShoppingMallTemplate()
  const deleteShoppingMallTemplateMutation = useDeleteShoppingMallTemplate()
  const analyzeShoppingMallFileMutation = useAnalyzeShoppingMallFile()

  const isLoading =
    isLoadingExclusion || isLoadingDuplicateCheck || isLoadingCourier || isLoadingShoppingMall || isLoadingMfa

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
        <EmailVerificationForm />
        <MfaForm settings={mfaSettings} />
        <SMTPForm />
        <CourierForm
          isSaving={updateCourierMappingMutation.isPending || addCourierMappingMutation.isPending}
          mappings={courierMappings ?? []}
          onAdd={(data) => addCourierMappingMutation.mutate(data)}
          onRemove={(id) => removeCourierMappingMutation.mutate(id)}
          onUpdate={(id, data) => updateCourierMappingMutation.mutate({ id, data })}
        />
        <ShoppingMallForm
          isDeleting={deleteShoppingMallTemplateMutation.isPending}
          isSaving={createShoppingMallTemplateMutation.isPending || updateShoppingMallTemplateMutation.isPending}
          onAnalyze={(file, headerRow) => analyzeShoppingMallFileMutation.mutateAsync({ file, headerRow })}
          onCreate={(data) => createShoppingMallTemplateMutation.mutate(data)}
          onDelete={(id) => deleteShoppingMallTemplateMutation.mutate(id)}
          onUpdate={(id, data) => updateShoppingMallTemplateMutation.mutate({ id, data })}
          templates={shoppingMallTemplates ?? []}
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
