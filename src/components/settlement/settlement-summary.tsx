'use client'

import { DollarSign, Hash, Package } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/mock-data'

interface SettlementSummaryProps {
  manufacturerName: string
  period: string
  totalCost: number
  totalOrders: number
  totalQuantity: number
}

export function SettlementSummary({
  totalOrders,
  totalQuantity,
  totalCost,
  manufacturerName,
  period,
}: SettlementSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{manufacturerName} 정산 요약</h2>
        <span className="text-sm text-slate-500">{period}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Hash className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">총 발주건수</p>
              <p className="text-xl font-semibold text-slate-900">{totalOrders.toLocaleString()}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">총 수량</p>
              <p className="text-xl font-semibold text-slate-900">{totalQuantity.toLocaleString()}개</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">총 원가 합계</p>
              <p className="text-xl font-semibold text-slate-900">{formatCurrency(totalCost)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
