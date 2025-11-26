"use client";

import { AppShell } from "@/components/layout";
import {
  StatCard,
  RecentUploads,
  ManufacturerChart,
  QuickActions,
} from "@/components/dashboard";
import { dashboardStats } from "@/lib/mock-data";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <AppShell
      title="대시보드"
      description="오늘의 주문 현황과 발주 상태를 확인하세요"
    >
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="오늘 주문"
          value={dashboardStats.todayOrders}
          change={dashboardStats.todayOrdersChange}
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
        />
        <StatCard
          title="처리 대기"
          value={dashboardStats.pendingOrders}
          change={dashboardStats.pendingOrdersChange}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
        />
        <StatCard
          title="발송 완료"
          value={dashboardStats.completedOrders}
          change={dashboardStats.completedOrdersChange}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
        />
        <StatCard
          title="오류 건수"
          value={dashboardStats.errorOrders}
          change={dashboardStats.errorOrdersChange}
          icon={AlertCircle}
          iconColor="text-rose-600"
          iconBgColor="bg-rose-50"
        />
      </div>

      {/* Main Content */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent Uploads & Chart - 2 columns */}
        <div className="space-y-6 lg:col-span-2">
          <RecentUploads />
          <ManufacturerChart />
        </div>

        {/* Quick Actions - 1 column */}
        <div>
          <QuickActions />
        </div>
      </div>
    </AppShell>
  );
}

