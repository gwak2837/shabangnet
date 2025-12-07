'use client'

import { Building2, Loader2, TrendingUp, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { OrderTemplate } from '@/services/manufacturers'
import type { InvoiceTemplate, Manufacturer } from '@/services/manufacturers.types'

import { queryKeys } from '@/common/constants/query-keys'
import { AppShell } from '@/components/layout/app-shell'
import { ManufacturerModal } from '@/components/manufacturer/manufacturer-modal'
import { ManufacturerTable } from '@/components/manufacturer/manufacturer-table'
import { Card, CardContent } from '@/components/ui/card'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { useServerAction } from '@/hooks/use-server-action'
import { create, remove, update, updateInvoiceTemplate, updateOrderTemplate } from '@/services/manufacturers'

export default function ManufacturersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null)

  const { data: manufacturers = [], isLoading } = useManufacturers()

  const { execute: createManufacturer, isPending: isCreating } = useServerAction(create, {
    invalidateKeys: [queryKeys.manufacturers.all],
    onSuccess: () => toast.success('제조사가 등록되었습니다'),
    onError: (error) => toast.error(error),
  })

  const { execute: updateManufacturer, isPending: isUpdating } = useServerAction(
    ({ id, data }: { id: number; data: Partial<Manufacturer> }) => update(id, data),
    {
      invalidateKeys: [queryKeys.manufacturers.all],
      onSuccess: () => toast.success('제조사 정보가 수정되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: deleteManufacturer, isPending: isDeleting } = useServerAction(remove, {
    invalidateKeys: [queryKeys.manufacturers.all],
    onSuccess: () => toast.success('제조사가 삭제되었습니다'),
    onError: (error) => toast.error(error),
  })

  const { execute: saveInvoiceTemplate, isPending: isSavingInvoice } = useServerAction(
    ({ manufacturerId, template }: { manufacturerId: number; template: InvoiceTemplate }) =>
      updateInvoiceTemplate(manufacturerId, template),
    {
      invalidateKeys: [['invoiceTemplate']],
    },
  )

  const { execute: saveOrderTemplate, isPending: isSavingOrder } = useServerAction(
    ({
      manufacturerId,
      template,
    }: {
      manufacturerId: number
      template: Omit<OrderTemplate, 'id' | 'manufacturerId' | 'manufacturerName'>
    }) => updateOrderTemplate(manufacturerId, template),
    {
      invalidateKeys: [['orderTemplate']],
    },
  )

  const handleAdd = () => {
    setEditingManufacturer(null)
    setIsModalOpen(true)
  }

  const handleEdit = (manufacturer: Manufacturer) => {
    setEditingManufacturer(manufacturer)
    setIsModalOpen(true)
  }

  const handleDelete = (id: number) => {
    deleteManufacturer(id)
  }

  const handleSave = (
    data: Partial<Manufacturer>,
    invoiceTemplate?: Partial<InvoiceTemplate>,
    orderTemplate?: Partial<OrderTemplate>,
  ) => {
    if (editingManufacturer) {
      // 제조사 정보 업데이트
      updateManufacturer({ id: editingManufacturer.id, data })

      // 송장 템플릿 업데이트
      if (invoiceTemplate) {
        saveInvoiceTemplate({
          manufacturerId: editingManufacturer.id,
          template: {
            id: 0,
            manufacturerId: editingManufacturer.id,
            manufacturerName: data.name || editingManufacturer.name,
            orderNumberColumn: invoiceTemplate.orderNumberColumn || 'A',
            courierColumn: invoiceTemplate.courierColumn || 'B',
            trackingNumberColumn: invoiceTemplate.trackingNumberColumn || 'C',
            headerRow: invoiceTemplate.headerRow || 1,
            dataStartRow: invoiceTemplate.dataStartRow || 2,
            useColumnIndex: invoiceTemplate.useColumnIndex ?? true,
          },
        })
      }

      // 발주서 템플릿 업데이트
      if (orderTemplate && Object.keys(orderTemplate.columnMappings || {}).length > 0) {
        saveOrderTemplate({
          manufacturerId: editingManufacturer.id,
          template: {
            headerRow: orderTemplate.headerRow || 1,
            dataStartRow: orderTemplate.dataStartRow || 2,
            columnMappings: orderTemplate.columnMappings || {},
            fixedValues: orderTemplate.fixedValues,
            templateFileName: orderTemplate.templateFileName,
          },
        })
      }
    } else {
      // 새 제조사 생성
      createManufacturer(data as Omit<Manufacturer, 'id' | 'lastOrderDate' | 'orderCount'>)
      // 새로 생성된 제조사에 대한 템플릿은 나중에 수정 시 설정
    }
  }

  const isSaving = isCreating || isUpdating || isSavingInvoice || isSavingOrder

  // Calculate stats
  const stats = useMemo(() => {
    const totalManufacturers = manufacturers.length
    const totalOrders = manufacturers.reduce((sum, m) => sum + m.orderCount, 0)
    const avgOrders = totalManufacturers > 0 ? Math.round(totalOrders / totalManufacturers) : 0
    return { totalManufacturers, totalOrders, avgOrders }
  }, [manufacturers])

  if (isLoading) {
    return (
      <AppShell description="거래처 제조사 정보를 관리합니다" title="제조사 관리">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="거래처 제조사 정보를 관리합니다" title="제조사 관리">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
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
      <ManufacturerTable manufacturers={manufacturers} onAdd={handleAdd} onDelete={handleDelete} onEdit={handleEdit} />

      {/* Add/Edit Modal */}
      <ManufacturerModal
        isSaving={isSaving}
        manufacturer={editingManufacturer}
        onOpenChange={setIsModalOpen}
        onSave={handleSave}
        open={isModalOpen}
      />
    </AppShell>
  )
}
