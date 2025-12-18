'use client'

import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/utils/cn'

interface StatCardProps {
  change?: StatChange
  changeLabel?: string
  goodDirection?: 'decrease' | 'increase'
  icon: LucideIcon
  iconBgColor?: string
  iconColor?: string
  secondaryText?: string
  title: string
  value: number | string
}

type StatChange =
  | { kind: 'absolute'; unit?: string; value: number }
  | { kind: 'percent'; value: number }

export function StatCard({
  title,
  value,
  change,
  changeLabel = '어제 같은 시간 대비',
  goodDirection = 'increase',
  secondaryText,
  icon: Icon,
  iconColor = 'text-slate-600',
  iconBgColor = 'bg-slate-100',
}: StatCardProps) {
  const changeValue = change?.value ?? 0
  const isIncrease = change !== undefined && changeValue > 0
  const isDecrease = change !== undefined && changeValue < 0
  const isNeutralChange = change !== undefined && changeValue === 0

  const isGood =
    change !== undefined && changeValue !== 0 && (goodDirection === 'decrease' ? isDecrease : isIncrease)
  const isBad = change !== undefined && changeValue !== 0 && (goodDirection === 'decrease' ? isIncrease : isDecrease)

  const changeTextColor = isGood ? 'text-emerald-600' : isBad ? 'text-rose-600' : 'text-slate-500'

  function formatChangeText(c: StatChange): string {
    if (c.kind === 'percent') return `${Math.abs(c.value)}%`

    const unit = c.unit ?? '건'
    const sign = c.value > 0 ? '+' : c.value < 0 ? '-' : ''
    const absValue = Math.abs(c.value)
    return `${sign}${absValue.toLocaleString('ko-KR')}${unit}`
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900">
              {typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
            </p>
            {secondaryText ? (
              <p className="text-xs text-slate-400">{secondaryText}</p>
            ) : (
              change !== undefined && (
              <div className="flex items-center gap-1.5">
                {(isIncrease || isDecrease) && (
                  <span className={cn('flex items-center gap-0.5 text-xs font-medium', changeTextColor)}>
                    {isIncrease && <ArrowUp className="h-3 w-3" />}
                    {isDecrease && <ArrowDown className="h-3 w-3" />}
                    {formatChangeText(change)}
                  </span>
                )}
                {isNeutralChange && (
                  <span className={cn('text-xs font-medium', changeTextColor)}>{formatChangeText(change)}</span>
                )}
                <span className="text-xs text-slate-400">{changeLabel}</span>
              </div>
              )
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
