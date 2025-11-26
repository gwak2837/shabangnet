'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout'
import { ManufacturerTable, ManufacturerModal } from '@/components/manufacturers'
import { Card, CardContent } from '@/components/ui/card'
import { type Manufacturer, manufacturers } from '@/lib/mock-data'
import { Building2, Users, Mail, TrendingUp } from 'lucide-react'

export default function ManufacturersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null)

  const handleAdd = () => {
    setEditingManufacturer(null)
    setIsModalOpen(true)
  }

  const handleEdit = (manufacturer: Manufacturer) => {
    setEditingManufacturer(manufacturer)
    setIsModalOpen(true)
  }

  const handleSave = (data: Partial<Manufacturer>) => {
    // In real app, this would call API
    console.log('Save manufacturer:', data)
  }

  // Calculate stats
  const totalManufacturers = manufacturers.length
  const totalOrders = manufacturers.reduce((sum, m) => sum + m.orderCount, 0)
  const avgOrders = Math.round(totalOrders / totalManufacturers)

  return (
    <AppShell title="제조사 관리" description="거래처 제조사 정보를 관리합니다">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">등록 제조사</p>
              <p className="text-xl font-semibold text-slate-900">{totalManufacturers}곳</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">총 누적 주문</p>
              <p className="text-xl font-semibold text-slate-900">{totalOrders.toLocaleString()}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">제조사당 평균 주문</p>
              <p className="text-xl font-semibold text-slate-900">{avgOrders.toLocaleString()}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manufacturer Table */}
      <ManufacturerTable onEdit={handleEdit} onAdd={handleAdd} />

      {/* Add/Edit Modal */}
      <ManufacturerModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        manufacturer={editingManufacturer}
        onSave={handleSave}
      />
    </AppShell>
  )
}
