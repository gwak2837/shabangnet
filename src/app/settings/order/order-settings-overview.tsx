'use client'

import type { ReactNode } from 'react'

import { useQuery } from '@tanstack/react-query'
import { ChevronRight, FileSpreadsheet, Filter, type LucideIcon, ShieldCheck, Store, Truck } from 'lucide-react'
import Link from 'next/link'

import { queryKeys } from '@/common/constants/query-keys'
import { Switch } from '@/components/ui/switch'
import { useServerAction } from '@/hooks/use-server-action'
import { useDuplicateCheckSettings, useShoppingMallTemplates } from '@/hooks/use-settings'
import { cn } from '@/utils/cn'

import { updateDuplicateCheckSettings } from './action'
import { getCommonOrderTemplate } from './common-order-template/action'
import { useCourierMappings } from './courier/hook'
import { updateExclusionSettings } from './exclusion/action'
import { useExclusionSettings } from './exclusion/hook'

type SettingsAccent = 'blue' | 'orange' | 'purple'

const accentStyles: Record<SettingsAccent, string> = {
  blue: 'bg-blue-600/10 text-blue-600 ring-blue-600/15',
  purple: 'bg-violet-600/10 text-violet-600 ring-violet-600/15',
  orange: 'bg-amber-600/10 text-amber-600 ring-amber-600/15',
}

interface BadgeProps {
  accent: SettingsAccent
  icon: LucideIcon
}

interface GroupProps {
  children: ReactNode
  title: string
}

interface NavigableRowProps {
  accent: SettingsAccent
  description: string
  href: string
  icon: LucideIcon
  summary?: string
  title: string
}

interface ToggleRowProps {
  accent: SettingsAccent
  checked: boolean
  description: string
  disabled?: boolean
  href: string
  icon: LucideIcon
  onCheckedChange: (checked: boolean) => void
  title: string
}

export function OrderSettingsOverview() {
  const { data: shoppingMallTemplates, isLoading: isLoadingShoppingMalls } = useShoppingMallTemplates()
  const { data: exclusionSettings, isLoading: isLoadingExclusion } = useExclusionSettings()
  const { data: duplicateCheckSettings, isLoading: isLoadingDuplicateCheck } = useDuplicateCheckSettings()
  const { data: courierMappings, isLoading: isLoadingCouriers } = useCourierMappings()
  const { data: commonTemplate, isLoading: isLoadingCommonTemplate } = useQuery({
    queryKey: queryKeys.orderTemplates.common,
    queryFn: getCommonOrderTemplate,
  })

  const [isUpdatingExclusion, updateExclusion] = useServerAction(updateExclusionSettings, {
    invalidateKeys: [queryKeys.settings.exclusion],
  })

  const [isUpdatingDuplicateCheck, updateDuplicateCheck] = useServerAction(updateDuplicateCheckSettings, {
    invalidateKeys: [queryKeys.settings.duplicateCheck],
  })

  const shoppingTotal = shoppingMallTemplates?.length ?? 0
  const shoppingEnabled = (shoppingMallTemplates ?? []).filter((t) => t.enabled).length
  const shoppingSummary = isLoadingShoppingMalls
    ? '불러오는 중...'
    : shoppingTotal === 0
      ? '없어요'
      : `${shoppingEnabled}/${shoppingTotal} 활성`

  const commonSummary = isLoadingCommonTemplate
    ? '불러오는 중...'
    : commonTemplate?.templateFileName
      ? '설정됨'
      : '미설정'

  const exclusionEnabledCount = (exclusionSettings?.patterns ?? []).filter((p) => p.enabled).length
  const exclusionSummary = isLoadingExclusion
    ? '불러오는 중...'
    : `활성 패턴 ${exclusionEnabledCount}/${exclusionSettings?.patterns.length ?? 0}개`

  const duplicateSummary = isLoadingDuplicateCheck
    ? '불러오는 중...'
    : duplicateCheckSettings?.enabled
      ? typeof duplicateCheckSettings.periodDays === 'number'
        ? `기간 ${duplicateCheckSettings.periodDays}일`
        : '기간 미설정'
      : '꺼짐'

  const courierEnabled = (courierMappings ?? []).filter((c) => c.enabled).length
  const courierTotal = courierMappings?.length ?? 0
  const courierSummary = isLoadingCouriers
    ? '불러오는 중...'
    : courierTotal === 0
      ? '없어요'
      : `${courierEnabled}개 연결`

  return (
    <div className="grid gap-8 max-w-3xl">
      <SettingsGroup title="템플릿">
        <NavigableRow
          accent="purple"
          description="쇼핑몰별 엑셀 파일 양식을 관리해요"
          href="/settings/order/shopping-mall-template"
          icon={Store}
          summary={shoppingSummary}
          title="쇼핑몰 템플릿"
        />
        <NavigableRow
          accent="blue"
          description="제조사 템플릿이 없을 때 사용해요"
          href="/settings/order/common-order-template"
          icon={FileSpreadsheet}
          summary={commonSummary}
          title="공통 발주서 템플릿"
        />
      </SettingsGroup>

      <SettingsGroup title="검증 & 필터">
        <ToggleRow
          accent="purple"
          checked={exclusionSettings?.enabled ?? true}
          description={exclusionSummary}
          disabled={isLoadingExclusion || isUpdatingExclusion}
          href="/settings/order/exclusion"
          icon={Filter}
          onCheckedChange={(checked) => updateExclusion({ enabled: checked })}
          title="발송 제외"
        />
        <ToggleRow
          accent="orange"
          checked={duplicateCheckSettings?.enabled ?? false}
          description={duplicateSummary}
          disabled={isLoadingDuplicateCheck || isUpdatingDuplicateCheck}
          href="/settings/order/duplicate-check"
          icon={ShieldCheck}
          onCheckedChange={(checked) => updateDuplicateCheck({ enabled: checked })}
          title="중복 발주 방지"
        />
      </SettingsGroup>

      <SettingsGroup title="배송">
        <NavigableRow
          accent="blue"
          description="송장의 택배사명을 자동으로 인식해요"
          href="/settings/order/courier"
          icon={Truck}
          summary={courierSummary}
          title="택배사"
        />
      </SettingsGroup>
    </div>
  )
}

function IconBadge({ accent, icon: Icon }: BadgeProps) {
  return (
    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset', accentStyles[accent])}>
      <Icon aria-hidden="true" className="h-5 w-5" />
    </div>
  )
}

function NavigableRow({ href, accent, icon, title, description, summary }: NavigableRowProps) {
  return (
    <li className="grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3">
      <IconBadge accent={accent} icon={icon} />
      <Link
        className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        href={href}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="truncate text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {summary ? <span className="shrink-0">{summary}</span> : null}
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </div>
        </div>
      </Link>
    </li>
  )
}

function SettingsGroup({ title, children }: GroupProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">{children}</ul>
    </section>
  )
}

function ToggleRow({ href, accent, icon, title, description, checked, disabled, onCheckedChange }: ToggleRowProps) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
      <IconBadge accent={accent} icon={icon} />
      <Link
        className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        href={href}
      >
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="truncate text-sm text-muted-foreground">{description}</p>
          </div>
          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </Link>
      <Switch aria-disabled={disabled} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </li>
  )
}
