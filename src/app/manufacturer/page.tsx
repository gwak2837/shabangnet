'use client'

import { Building2, Loader2, TrendingUp, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { Manufacturer } from '@/services/manufacturers.types'

import { AppShell } from '@/components/layout/app-shell'
import { ManufacturerModal } from '@/components/manufacturer/manufacturer-modal'
import { ManufacturerTable } from '@/components/manufacturer/manufacturer-table'
import { Card, CardContent } from '@/components/ui/card'
import { useManufacturers } from '@/hooks/use-manufacturers'

export default function ManufacturersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null)

  const { data: manufacturers = [], isLoading } = useManufacturers()

  const handleEdit = (manufacturer: Manufacturer) => {
    setEditingManufacturer(manufacturer)
    setIsModalOpen(true)
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalManufacturers = manufacturers.length
    const totalOrders = manufacturers.reduce((sum, m) => sum + m.orderCount, 0)
    const avgOrders = totalManufacturers > 0 ? Math.round(totalOrders / totalManufacturers) : 0
    return { totalManufacturers, totalOrders, avgOrders }
  }, [manufacturers])

  if (isLoading) {
    return (
      <AppShell description="거래처 제조사 정보를 관리해요" title="제조사 관리">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="거래처 제조사 정보를 관리해요" title="제조사 관리">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">등록 제조사</p>
              <p className="text-xl font-semibold text-slate-900">{stats.totalManufacturers}곳</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">총 누적 주문</p>
              <p className="text-xl font-semibold text-slate-900">{stats.totalOrders.toLocaleString()}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">제조사당 평균 주문</p>
              <p className="text-xl font-semibold text-slate-900">{stats.avgOrders.toLocaleString()}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manufacturer Table */}
      <ManufacturerTable manufacturers={manufacturers} onEdit={handleEdit} />

      {/* Add/Edit Modal */}
      <ManufacturerModal
        manufacturer={editingManufacturer}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) {
            setEditingManufacturer(null)
          }
        }}
        open={isModalOpen}
      />
    </AppShell>
  )
}
