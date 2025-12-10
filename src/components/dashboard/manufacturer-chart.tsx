'use client'

import { Loader2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { ChartDataItem } from '@/services/dashboard'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/utils/format/number'

const COLORS = [
  'oklch(0.65 0.15 250)',
  'oklch(0.60 0.14 250)',
  'oklch(0.55 0.13 250)',
  'oklch(0.50 0.12 250)',
  'oklch(0.45 0.11 250)',
]

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: {
      name: string
      orders: number
      amount: number
    }
  }>
}

interface ManufacturerChartProps {
  data: ChartDataItem[]
  isLoading?: boolean
}

export function ManufacturerChart({ data, isLoading }: ManufacturerChartProps) {
  return (
    <Card className="border-slate-200 bg-card shadow-sm py-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">제조사별 발주 현황</CardTitle>
          <a className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors" href="/order">
            상세보기
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart barSize={40} data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="name"
                    dy={10}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis axisLine={false} dx={-10} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                    {data.map((_, index) => (
                      <Cell fill={COLORS[index % COLORS.length]} key={`cell-${index}`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
              {data.map((item, index) => (
                <div className="flex items-center gap-2" key={item.name}>
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-slate-200 bg-card p-3 shadow-lg">
        <p className="font-semibold text-slate-900">{data.name}</p>
        <p className="text-sm text-slate-600">
          주문 수: <span className="font-medium">{data.orders}건</span>
        </p>
        <p className="text-sm text-slate-600">
          금액: <span className="font-medium">{formatCurrency(data.amount)}</span>
        </p>
      </div>
    )
  }
  return null
}
