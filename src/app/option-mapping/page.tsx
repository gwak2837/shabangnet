'use client'

import { Building2, Loader2, Package, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { OptionManufacturerMapping } from '@/services/option-mappings'

import { queryKeys } from '@/common/constants/query-keys'
import { AppShell } from '@/components/layout/app-shell'
import { OptionMappingFilters } from '@/components/option-mapping/option-mapping-filters'
import { OptionMappingModal } from '@/components/option-mapping/option-mapping-modal'
import { OptionMappingTable } from '@/components/option-mapping/option-mapping-table'
import { Card, CardContent } from '@/components/ui/card'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { useOptionMappings } from '@/hooks/use-option-mappings'
import { useServerAction } from '@/hooks/use-server-action'
import { create, remove, update } from '@/services/option-mappings'

export default function OptionMappingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedManufacturer, setSelectedManufacturer] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<OptionManufacturerMapping | null>(null)

  const { data: mappings = [], isLoading: isLoadingMappings } = useOptionMappings()
  const { data: manufacturers = [] } = useManufacturers()

  const { execute: createMapping, isPending: isCreating } = useServerAction(create, {
    invalidateKeys: [queryKeys.optionMappings.all],
    onSuccess: () => {
      toast.success('매핑이 추가되었습니다')
      setIsModalOpen(false)
    },
    onError: (error) => toast.error(error),
  })

  const { execute: updateMapping, isPending: isUpdating } = useServerAction(
    ({ id, data }: { id: number; data: Partial<Omit<OptionManufacturerMapping, 'createdAt' | 'id'>> }) =>
      update(id, data),
    {
      invalidateKeys: [queryKeys.optionMappings.all],
      onSuccess: () => {
        toast.success('매핑이 수정되었습니다')
        setIsModalOpen(false)
      },
      onError: (error) => toast.error(error),
    },
  )

  const { execute: deleteMapping } = useServerAction(remove, {
    invalidateKeys: [queryKeys.optionMappings.all],
    onSuccess: () => toast.success('매핑이 삭제되었습니다'),
    onError: (error) => toast.error(error),
  })

  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      const matchesSearch =
        m.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.optionName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesManufacturer =
        selectedManufacturer === 'all' || m.manufacturerId === Number(selectedManufacturer)

      return matchesSearch && matchesManufacturer
    })
  }, [mappings, searchQuery, selectedManufacturer])

  const handleAddNew = () => {
    setEditingMapping(null)
    setIsModalOpen(true)
  }

  const handleEdit = (mapping: OptionManufacturerMapping) => {
    setEditingMapping(mapping)
    setIsModalOpen(true)
  }

  const handleDelete = (mappingId: number) => {
    deleteMapping(mappingId)
  }

  const handleSave = (data: Omit<OptionManufacturerMapping, 'createdAt' | 'id' | 'updatedAt'>) => {
    if (editingMapping) {
      updateMapping({ id: editingMapping.id, data })
    } else {
      createMapping(data)
    }
  }

  const isSaving = isCreating || isUpdating

  // Calculate stats
  const stats = useMemo(() => {
    const totalMappings = mappings.length
    const uniqueProductCodes = new Set(mappings.map((m) => m.productCode)).size
    const uniqueManufacturers = new Set(mappings.map((m) => m.manufacturerId)).size
    return { totalMappings, uniqueProductCodes, uniqueManufacturers }
  }, [mappings])

  if (isLoadingMappings) {
    return (
      <AppShell description="상품코드 + 옵션 조합별로 제조사를 매핑합니다" title="옵션 매핑">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="상품코드 + 옵션 조합별로 제조사를 매핑합니다" title="옵션 매핑">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Settings2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">전체 매핑</p>
              <p className="text-xl font-semibold text-slate-900">{stats.totalMappings}개</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">상품 수</p>
              <p className="text-xl font-semibold text-slate-900">{stats.uniqueProductCodes}개</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Building2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">제조사 수</p>
              <p className="text-xl font-semibold text-slate-900">{stats.uniqueManufacturers}개</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex gap-3">
          <Settings2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">옵션 매핑이란?</p>
            <p className="text-blue-700">
              같은 상품코드라도 옵션에 따라 다른 제조사에서 공급되는 경우, 옵션별로 제조사를 지정할 수 있습니다.
              <br />
              발주 생성 시 옵션 매핑이 우선 적용되며, 매핑이 없으면 기본 상품-제조사 매핑이 적용됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <OptionMappingFilters
          manufacturers={manufacturers}
          onAddNew={handleAddNew}
          onManufacturerChange={setSelectedManufacturer}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          selectedManufacturer={selectedManufacturer}
        />
      </div>

      {/* Mapping Table */}
      <OptionMappingTable mappings={filteredMappings} onDelete={handleDelete} onEdit={handleEdit} />

      {/* Modal */}
      <OptionMappingModal
        isSaving={isSaving}
        manufacturers={manufacturers}
        mapping={editingMapping}
        onOpenChange={setIsModalOpen}
        onSave={handleSave}
        open={isModalOpen}
      />
    </AppShell>
  )
}
