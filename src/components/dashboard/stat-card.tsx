'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconColor?: string
  iconBgColor?: string
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = '어제 대비',
  icon: Icon,
  iconColor = 'text-slate-600',
  iconBgColor = 'bg-slate-100',
}: StatCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <Card className="border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900">
              {typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
            </p>
            {change !== undefined && (
              <div className="flex items-center gap-1.5">
                {isPositive && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                    <ArrowUp className="h-3 w-3" />
                    {Math.abs(change)}%
                  </span>
                )}
                {isNegative && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-rose-600">
                    <ArrowDown className="h-3 w-3" />
                    {Math.abs(change)}%
                  </span>
                )}
                {change === 0 && <span className="text-xs font-medium text-slate-500">0%</span>}
                <span className="text-xs text-slate-400">{changeLabel}</span>
              </div>
            )}
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', iconBgColor)}>
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
