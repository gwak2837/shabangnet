'use client'

import { Loader2 } from 'lucide-react'

import { useDashboardStats } from '@/hooks/use-dashboard'
import { cn } from '@/utils/cn'

interface StatItemProps {
  isActive?: boolean
  label: string
  status: 'error' | 'neutral' | 'warning'
  value: number
}

export function StatusIndicator() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="hidden items-center gap-2 px-4 lg:flex">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const total = stats.todayOrders || 0
  const completed = stats.completedOrders || 0
  const pending = stats.todayPendingOrders || 0
  const error = stats.errorOrders || 0

  // 진행률 계산
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="hidden items-center gap-6 px-2 lg:flex">
      <div className="flex min-w-[160px] flex-col justify-center gap-1.5">
        <div className="flex items-end justify-between leading-none">
          <span className="text-[11px] font-medium tracking-tight text-slate-500">오늘 처리율</span>
          <span className="text-xs font-semibold text-slate-900">{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-700 ease-in-out motion-reduce:duration-0"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="h-8 w-px bg-slate-100" />
      <div className="flex items-center gap-5">
        <StatItem label="대기" status="warning" value={pending} />
        <StatItem isActive={error > 0} label="오류" status="error" value={error} />
        <StatItem label="전체" status="neutral" value={total} />
      </div>
    </div>
  )
}

function StatItem({ isActive = true, label, status, value }: StatItemProps) {
  const statusColors = {
    neutral: 'bg-slate-200',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
  }

  return (
    <div className={cn('flex flex-col items-start gap-0.5', !isActive && 'opacity-50 grayscale')}>
      <div className="flex items-center gap-1.5">
        <div className={cn('w-1.5 h-1.5 rounded-full', statusColors[status])} />
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
      </div>
      <span className="pl-3 text-sm font-semibold leading-none text-slate-900">{value.toLocaleString()}</span>
    </div>
  )
}
