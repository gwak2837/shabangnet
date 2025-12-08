'use client'

import { AlertCircle, CheckCircle2, Clock, Loader2, ShoppingCart } from 'lucide-react'

import { ManufacturerChart } from '@/components/dashboard/manufacturer-chart'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RecentUploads } from '@/components/dashboard/recent-uploads'
import { StatCard } from '@/components/dashboard/stat-card'
import { AppShell } from '@/components/layout/app-shell'
import { useDashboardStats, useManufacturerChartData, useRecentUploads } from '@/hooks/use-dashboard'

export default function DashboardPage() {
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats()
  const { data: uploads, isLoading: isLoadingUploads } = useRecentUploads()
  const { data: chartData, isLoading: isLoadingChart } = useManufacturerChartData()

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
          change={stats?.todayOrdersChange ?? 0}
          icon={ShoppingCart}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          title="오늘 주문"
          value={stats?.todayOrders ?? 0}
        />
        <StatCard
          change={stats?.pendingOrdersChange ?? 0}
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          title="처리 대기"
          value={stats?.pendingOrders ?? 0}
        />
        <StatCard
          change={stats?.completedOrdersChange ?? 0}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          title="발송 완료"
          value={stats?.completedOrders ?? 0}
        />
        <StatCard
          change={stats?.errorOrdersChange ?? 0}
          icon={AlertCircle}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
          title="오류 건수"
          value={stats?.errorOrders ?? 0}
        />
      </div>

      {/* Main Content */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent Uploads & Chart - 2 columns */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <RecentUploads isLoading={isLoadingUploads} uploads={uploads ?? []} />
          <ManufacturerChart data={chartData ?? []} isLoading={isLoadingChart} />
        </div>

        {/* Quick Actions - 1 column */}
        <div>
          <QuickActions />
        </div>
      </div>
    </AppShell>
  )
}
