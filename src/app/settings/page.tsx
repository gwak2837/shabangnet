'use client'

import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { queryKeys } from '@/common/constants/query-keys'
import { AppShell } from '@/components/layout/app-shell'
import { CourierForm } from '@/components/settings/courier-form'
import { DuplicateCheckForm } from '@/components/settings/duplicate-check-form'
import { EmailLogsViewer } from '@/components/settings/email-logs-viewer'
import { EmailTemplateForm } from '@/components/settings/email-template-form'
import { EmailVerificationForm } from '@/components/settings/email-verification-form'
import { ExclusionForm } from '@/components/settings/exclusion-form'
import { MfaForm } from '@/components/settings/mfa-form'
import { ShoppingMallForm } from '@/components/settings/shopping-mall-form'
import { SmtpAccountsForm } from '@/components/settings/smtp-accounts-form'
import { useServerAction } from '@/hooks/use-server-action'
import {
  useCourierMappings,
  useDuplicateCheckSettings,
  useExclusionSettings,
  useMfaSettings,
  useShoppingMallTemplates,
} from '@/hooks/use-settings'
import {
  addCourierMapping,
  addExclusionPattern,
  type CourierMapping,
  type DuplicateCheckSettings,
  type ExclusionPattern,
  type ExclusionSettings,
  removeCourierMapping,
  removeExclusionPattern,
  updateCourierMapping,
  updateDuplicateCheckSettings,
  updateExclusionPattern,
  updateExclusionSettings,
} from '@/services/settings'
import {
  analyzeShoppingMallFile,
  createShoppingMallTemplate,
  type CreateTemplateData,
  deleteShoppingMallTemplate,
  updateShoppingMallTemplate,
  type UpdateTemplateData,
} from '@/services/shopping-mall-templates'

export default function SettingsPage() {
  // MFA Settings
  const { data: mfaSettings, isLoading: isLoadingMfa } = useMfaSettings()

  // Exclusion Settings
  const { data: exclusionSettings, isLoading: isLoadingExclusion } = useExclusionSettings()

  const { execute: updateExclusion, isPending: isUpdatingExclusion } = useServerAction(
    (data: Partial<ExclusionSettings>) => updateExclusionSettings(data),
    {
      invalidateKeys: [queryKeys.settings.exclusion],
      onSuccess: () => toast.success('설정이 저장되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: addPattern, isPending: isAddingPattern } = useServerAction(
    (pattern: Omit<ExclusionPattern, 'id'>) => addExclusionPattern(pattern),
    {
      invalidateKeys: [queryKeys.settings.exclusion],
      onSuccess: () => toast.success('패턴이 추가되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: removePattern } = useServerAction((id: string) => removeExclusionPattern(id), {
    invalidateKeys: [queryKeys.settings.exclusion],
    onSuccess: () => toast.success('패턴이 삭제되었습니다'),
    onError: (error) => toast.error(error),
  })

  const { execute: updatePattern, isPending: isUpdatingPattern } = useServerAction(
    ({ id, data }: { id: string; data: Partial<Omit<ExclusionPattern, 'id'>> }) => updateExclusionPattern(id, data),
    {
      invalidateKeys: [queryKeys.settings.exclusion],
      onSuccess: () => toast.success('패턴이 수정되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  // Duplicate Check Settings
  const { data: duplicateCheckSettings, isLoading: isLoadingDuplicateCheck } = useDuplicateCheckSettings()

  const { execute: updateDuplicateCheck, isPending: isUpdatingDuplicateCheck } = useServerAction(
    (data: Partial<DuplicateCheckSettings>) => updateDuplicateCheckSettings(data),
    {
      invalidateKeys: [queryKeys.settings.duplicateCheck],
      onSuccess: () => toast.success('설정이 저장되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  // Courier Mappings
  const { data: courierMappings, isLoading: isLoadingCourier } = useCourierMappings()

  const { execute: updateCourier, isPending: isUpdatingCourier } = useServerAction(
    ({ id, data }: { id: string; data: Partial<CourierMapping> }) => updateCourierMapping(id, data),
    {
      invalidateKeys: [queryKeys.settings.courier],
      onSuccess: () => toast.success('택배사 매핑이 수정되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: addCourier, isPending: isAddingCourier } = useServerAction(
    (data: Omit<CourierMapping, 'id'>) => addCourierMapping(data),
    {
      invalidateKeys: [queryKeys.settings.courier],
      onSuccess: () => toast.success('택배사 매핑이 추가되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: removeCourier } = useServerAction((id: string) => removeCourierMapping(id), {
    invalidateKeys: [queryKeys.settings.courier],
    onSuccess: () => toast.success('택배사 매핑이 삭제되었습니다'),
    onError: (error) => toast.error(error),
  })

  // Shopping Mall Templates
  const { data: shoppingMallTemplates, isLoading: isLoadingShoppingMall } = useShoppingMallTemplates()

  const { execute: createTemplate, isPending: isCreatingTemplate } = useServerAction(
    (data: CreateTemplateData) => createShoppingMallTemplate(data),
    {
      invalidateKeys: [queryKeys.shoppingMallTemplates.all],
      onSuccess: () => toast.success('쇼핑몰 템플릿이 생성되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: updateTemplate, isPending: isUpdatingTemplate } = useServerAction(
    ({ id, data }: { id: string; data: UpdateTemplateData }) => updateShoppingMallTemplate(id, data),
    {
      invalidateKeys: [queryKeys.shoppingMallTemplates.all],
      onSuccess: () => toast.success('쇼핑몰 템플릿이 수정되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: deleteTemplate, isPending: isDeletingTemplate } = useServerAction(
    (id: string) => deleteShoppingMallTemplate(id),
    {
      invalidateKeys: [queryKeys.shoppingMallTemplates.all],
      onSuccess: () => toast.success('쇼핑몰 템플릿이 삭제되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  // Analyze function - returns a promise directly for mutateAsync-like behavior
  const handleAnalyze = async (file: File, headerRow?: number) => {
    return analyzeShoppingMallFile(file, headerRow)
  }

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
      <div className="max-w-3xl flex flex-col gap-6">
        <EmailVerificationForm />
        <MfaForm settings={mfaSettings} />
        <SmtpAccountsForm />
        <EmailTemplateForm />
        <EmailLogsViewer />
        <CourierForm
          isSaving={isUpdatingCourier || isAddingCourier}
          mappings={courierMappings ?? []}
          onAdd={(data) => addCourier(data)}
          onRemove={(id) => removeCourier(id)}
          onUpdate={(id, data) => updateCourier({ id, data })}
        />
        <ShoppingMallForm
          isDeleting={isDeletingTemplate}
          isSaving={isCreatingTemplate || isUpdatingTemplate}
          onAnalyze={handleAnalyze}
          onCreate={(data) => createTemplate(data)}
          onDelete={(id) => deleteTemplate(id)}
          onUpdate={(id, data) => updateTemplate({ id, data })}
          templates={shoppingMallTemplates ?? []}
        />
        <DuplicateCheckForm
          isSaving={isUpdatingDuplicateCheck}
          onSave={(data) => updateDuplicateCheck(data)}
          settings={duplicateCheckSettings}
        />
        <ExclusionForm
          isSaving={isUpdatingExclusion || isAddingPattern}
          isUpdating={isUpdatingPattern}
          onAddPattern={(pattern) => addPattern(pattern)}
          onRemovePattern={(id) => removePattern(id)}
          onUpdatePattern={(id, data) => updatePattern({ id, data })}
          onUpdateSettings={(data) => updateExclusion(data)}
          settings={exclusionSettings}
        />
      </div>
    </AppShell>
  )
}
