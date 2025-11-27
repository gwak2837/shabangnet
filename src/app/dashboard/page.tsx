'use client'

import { ManufacturerChart, QuickActions, RecentUploads, StatCard } from '@/components/dashboard'
import { AppShell } from '@/components/layout'
import { useDashboardStats, useRecentUploads, useManufacturerChartData } from '@/hooks'
import { AlertCircle, CheckCircle2, Clock, ShoppingCart, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats()
  const { data: uploads, isLoading: isLoadingUploads } = useRecentUploads()
  const { data: chartData, isLoading: isLoadingChart } = useManufacturerChartData()

  if (isLoadingStats) {
    return (
      <AppShell title="대시보드" description="오늘의 주문 현황과 발주 상태를 확인하세요">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="대시보드" description="오늘의 주문 현황과 발주 상태를 확인하세요">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="오늘 주문"
          value={stats?.todayOrders ?? 0}
          change={stats?.todayOrdersChange ?? 0}
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
        />
        <StatCard
          title="처리 대기"
          value={stats?.pendingOrders ?? 0}
          change={stats?.pendingOrdersChange ?? 0}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
        />
        <StatCard
          title="발송 완료"
          value={stats?.completedOrders ?? 0}
          change={stats?.completedOrdersChange ?? 0}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
        />
        <StatCard
          title="오류 건수"
          value={stats?.errorOrders ?? 0}
          change={stats?.errorOrdersChange ?? 0}
          icon={AlertCircle}
          iconColor="text-rose-600"
          iconBgColor="bg-rose-50"
        />
      </div>

      {/* Main Content */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent Uploads & Chart - 2 columns */}
        <div className="space-y-6 lg:col-span-2">
          <RecentUploads uploads={uploads ?? []} isLoading={isLoadingUploads} />
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
