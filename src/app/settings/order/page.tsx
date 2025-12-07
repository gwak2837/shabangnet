'use client'

import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { CourierForm } from '@/app/settings/order/courier-form'
import { ShoppingMallTemplate } from '@/app/settings/order/shopping-mall-template'
import { SynonymForm } from '@/app/settings/order/synonym-form'
import { queryKeys } from '@/common/constants/query-keys'
import { DuplicateCheckForm } from '@/components/settings/duplicate-check-form'
import { ExclusionForm } from '@/components/settings/exclusion-form'
import { useServerAction } from '@/hooks/use-server-action'
import {
  useColumnSynonyms,
  useCourierMappings,
  useDuplicateCheckSettings,
  useExclusionSettings,
  useShoppingMallTemplates,
} from '@/hooks/use-settings'
import { addSynonym, removeSynonym, updateSynonym } from '@/services/column-synonyms'
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

export default function OrdersSettingsPage() {
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

  // Column Synonyms
  const { data: columnSynonyms, isLoading: isLoadingSynonyms } = useColumnSynonyms()

  const { execute: addSynonymAction, isPending: isAddingSynonym } = useServerAction(
    (data: { standardKey: string; synonym: string }) => addSynonym(data),
    {
      invalidateKeys: [queryKeys.settings.synonyms],
      onSuccess: () => toast.success('동의어가 추가되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: updateSynonymAction, isPending: isUpdatingSynonym } = useServerAction(
    ({ id, data }: { id: string; data: Partial<{ enabled: boolean; standardKey: string; synonym: string }> }) =>
      updateSynonym(id, data),
    {
      invalidateKeys: [queryKeys.settings.synonyms],
      onSuccess: () => toast.success('동의어가 수정되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: removeSynonymAction } = useServerAction((id: string) => removeSynonym(id), {
    invalidateKeys: [queryKeys.settings.synonyms],
    onSuccess: () => toast.success('동의어가 삭제되었습니다'),
    onError: (error) => toast.error(error),
  })

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

  const isLoading =
    isLoadingExclusion || isLoadingDuplicateCheck || isLoadingCourier || isLoadingShoppingMall || isLoadingSynonyms

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <CourierForm
        isSaving={isUpdatingCourier || isAddingCourier}
        mappings={courierMappings ?? []}
        onAdd={(data) => addCourier(data)}
        onRemove={(id) => removeCourier(id)}
        onUpdate={(id, data) => updateCourier({ id, data })}
      />
      <ShoppingMallTemplate
        isDeleting={isDeletingTemplate}
        isSaving={isCreatingTemplate || isUpdatingTemplate}
        onAnalyze={analyzeShoppingMallFile}
        onCreate={(data) => createTemplate(data)}
        onDelete={(id) => deleteTemplate(id)}
        onUpdate={(id, data) => updateTemplate({ id, data })}
        templates={shoppingMallTemplates ?? []}
      />
      <SynonymForm
        isAdding={isAddingSynonym}
        isUpdating={isUpdatingSynonym}
        onAdd={(data) => addSynonymAction(data)}
        onRemove={(id) => removeSynonymAction(id)}
        onUpdate={(id, data) => updateSynonymAction({ id, data })}
        synonyms={columnSynonyms ?? []}
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
  )
}
