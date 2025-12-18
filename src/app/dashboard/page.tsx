'use client'

import { CheckCircle2, Clock, Loader2, ShoppingCart, XCircle } from 'lucide-react'

import { ManufacturerChart } from '@/app/dashboard/manufacturer-chart'
import { RecentUploads } from '@/app/dashboard/recent-uploads'
import { StatCard } from '@/app/dashboard/stat-card'
import { AppShell } from '@/components/layout/app-shell'
import { useDashboardStats, useManufacturerChartData, useRecentUploads } from '@/hooks/use-dashboard'

export default function DashboardPage() {
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats()
  const { data: uploads, isLoading: isLoadingUploads } = useRecentUploads()
  const { data: chartData, isLoading: isLoadingChart } = useManufacturerChartData()

  const todayOrders = stats?.todayOrders ?? 0
  const yesterdayOrders = stats?.yesterdayOrders ?? 0

  const todayOrdersSecondaryText =
    todayOrders === 0
      ? yesterdayOrders > 0
        ? `오늘은 아직 주문이 없어요 · 어제 이 시간 ${yesterdayOrders.toLocaleString('ko-KR')}건 있었어요`
        : '오늘은 아직 주문이 없어요'
      : undefined

  const pendingOrders = stats?.pendingOrders ?? 0
  const yesterdayPendingOrders = stats?.yesterdayPendingOrders ?? 0

  const pendingOrdersSecondaryText =
    pendingOrders === 0
      ? yesterdayPendingOrders > 0
        ? `지금은 처리 대기가 없어요 · 어제 이 시간 ${yesterdayPendingOrders.toLocaleString('ko-KR')}건 있었어요`
        : '지금은 처리 대기가 없어요'
      : undefined

  const completedOrders = stats?.completedOrders ?? 0
  const yesterdayCompletedOrders = stats?.yesterdayCompletedOrders ?? 0

  const completedOrdersSecondaryText =
    completedOrders === 0
      ? yesterdayCompletedOrders > 0
        ? `오늘은 아직 발송 완료가 없어요 · 어제 이 시간 ${yesterdayCompletedOrders.toLocaleString('ko-KR')}건 있었어요`
        : '오늘은 아직 발송 완료가 없어요'
      : undefined

  const errorOrders = stats?.errorOrders ?? 0
  const yesterdayErrorOrders = stats?.yesterdayErrorOrders ?? 0

  const errorOrdersSecondaryText =
    errorOrders === 0
      ? yesterdayErrorOrders > 0
        ? `오늘은 오류가 없어요 · 어제 이 시간 ${yesterdayErrorOrders.toLocaleString('ko-KR')}건 있었어요`
        : '오늘은 오류가 없어요'
      : undefined

  function getPercentChange(today: number, yesterday: number): number {
    return Math.round(((today - yesterday) / yesterday) * 100)
  }

  if (isLoadingStats) {
    return (
      <AppShell description="오늘의 주문 현황과 발주 상태를 확인하세요" title="대시보드">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="오늘의 주문 현황과 발주 상태를 확인하세요" title="대시보드">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          change={
            todayOrdersSecondaryText
              ? undefined
              : yesterdayOrders <= 0
                ? todayOrders > 0
                  ? { kind: 'absolute', unit: '건', value: todayOrders }
                  : { kind: 'percent', value: 0 }
                : { kind: 'percent', value: getPercentChange(todayOrders, yesterdayOrders) }
          }
          goodDirection="increase"
          icon={ShoppingCart}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          secondaryText={todayOrdersSecondaryText}
          title="오늘 주문"
          value={todayOrders}
        />
        <StatCard
          change={
            pendingOrdersSecondaryText
              ? undefined
              : yesterdayPendingOrders <= 0
                ? pendingOrders > 0
                  ? { kind: 'absolute', unit: '건', value: pendingOrders }
                  : { kind: 'percent', value: 0 }
                : { kind: 'percent', value: getPercentChange(pendingOrders, yesterdayPendingOrders) }
          }
          goodDirection="decrease"
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          secondaryText={pendingOrdersSecondaryText}
          title="처리 대기"
          value={pendingOrders}
        />
        <StatCard
          change={
            completedOrdersSecondaryText
              ? undefined
              : yesterdayCompletedOrders <= 0
                ? completedOrders > 0
                  ? { kind: 'absolute', unit: '건', value: completedOrders }
                  : { kind: 'percent', value: 0 }
                : { kind: 'percent', value: getPercentChange(completedOrders, yesterdayCompletedOrders) }
          }
          goodDirection="increase"
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          secondaryText={completedOrdersSecondaryText}
          title="발송 완료"
          value={completedOrders}
        />
        <StatCard
          change={
            errorOrdersSecondaryText
              ? undefined
              : yesterdayErrorOrders <= 0
                ? errorOrders > 0
                  ? { kind: 'absolute', unit: '건', value: errorOrders }
                  : { kind: 'percent', value: 0 }
                : { kind: 'percent', value: getPercentChange(errorOrders, yesterdayErrorOrders) }
          }
          goodDirection="decrease"
          icon={XCircle}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
          secondaryText={errorOrdersSecondaryText}
          title="오류 건수"
          value={errorOrders}
        />
      </div>

      {/* Main Content */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <RecentUploads isLoading={isLoadingUploads} uploads={uploads ?? []} />
        <ManufacturerChart data={chartData ?? []} isLoading={isLoadingChart} />
      </div>
    </AppShell>
  )
}
