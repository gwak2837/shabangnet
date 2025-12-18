'use client'

import { AlertTriangle, CheckCircle2, Info, Pencil } from 'lucide-react'
import { useState } from 'react'

import type { Manufacturer } from '@/services/manufacturers.types'
import type { Product } from '@/services/products'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { shouldToggleRowSelection, TableSelectionCell, TableSelectionHeadCell } from '@/components/ui/table-selection'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatRelativeTime } from '@/utils/format/date'
import { formatCurrency, formatDateTime } from '@/utils/format/number'

interface ProductTableProps {
  isAdmin?: boolean
  manufacturers: Manufacturer[]
  onSelectAll?: (checked: boolean) => void
  onSelectItem?: (id: number, checked: boolean) => void
  onUpdateCost?: (productId: number, cost: number) => void
  onUpdateManufacturer: (productId: number, manufacturerId: number | null) => void
  onUpdateShippingFee?: (productId: number, shippingFee: number) => void
  products: Product[]
  selectedIds?: number[]
  selectionState?: 'all' | 'mixed' | 'none'
}

export function ProductTable({
  products,
  manufacturers,
  onUpdateManufacturer,
  onUpdateCost,
  onUpdateShippingFee,
  isAdmin = false,
  onSelectAll,
  onSelectItem,
  selectedIds = [],
  selectionState = 'none',
}: ProductTableProps) {
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [editingCostProductId, setEditingCostProductId] = useState<number | null>(null)
  const [costInputValue, setCostInputValue] = useState<string>('')
  const [editingShippingFeeProductId, setEditingShippingFeeProductId] = useState<number | null>(null)
  const [shippingFeeInputValue, setShippingFeeInputValue] = useState<string>('')

  function handleManufacturerChange(productId: number, value: string) {
    onUpdateManufacturer(productId, value === 'none' ? null : Number(value))
    setEditingProductId(null)
  }

  function handleCostEdit(productId: number, currentCost: number) {
    setEditingCostProductId(productId)
    setCostInputValue(currentCost.toString())
  }

  function handleCostSave(productId: number) {
    const cost = parseFloat(costInputValue) || 0
    if (onUpdateCost) {
      onUpdateCost(productId, cost)
    }
    setEditingCostProductId(null)
    setCostInputValue('')
  }

  function handleCostKeyDown(e: React.KeyboardEvent, productId: number) {
    if (e.key === 'Enter') {
      handleCostSave(productId)
    } else if (e.key === 'Escape') {
      setEditingCostProductId(null)
      setCostInputValue('')
    }
  }

  function handleShippingFeeEdit(productId: number, currentShippingFee: number) {
    setEditingShippingFeeProductId(productId)
    setShippingFeeInputValue(currentShippingFee.toString())
  }

  function handleShippingFeeSave(productId: number) {
    const shippingFee = parseFloat(shippingFeeInputValue) || 0
    if (onUpdateShippingFee) {
      onUpdateShippingFee(productId, shippingFee)
    }
    setEditingShippingFeeProductId(null)
    setShippingFeeInputValue('')
  }

  function handleShippingFeeKeyDown(e: React.KeyboardEvent, productId: number) {
    if (e.key === 'Enter') {
      handleShippingFeeSave(productId)
    } else if (e.key === 'Escape') {
      setEditingShippingFeeProductId(null)
      setShippingFeeInputValue('')
    }
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isAdmin && (
                <TableSelectionHeadCell
                  aria-label="전체 선택"
                  checked={selectionState === 'all' ? true : selectionState === 'mixed' ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onSelectAll?.(checked)}
                />
              )}
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상품코드</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상품명</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-center">
                판매가
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-center">
                원가
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-center">
                배송비
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-center">
                제조사
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-center">
                수정일
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TooltipProvider>
              {products.map((product) => {
                const isUnmapped = !product.manufacturerId
                const isEditing = editingProductId === product.id
                const hasPriceError = hasPriceValidationError(product)
                const isSelected = selectedIds.includes(product.id)

                return (
                  <TableRow
                    aria-selected={isAdmin ? isSelected : undefined}
                    className="hover:bg-slate-50 transition-colors aria-selected:[&_td:first-child]:bg-muted/50 data-[admin=true]:cursor-pointer data-[unmapped=true]:bg-amber-50/50 data-[price-error=true]:bg-rose-50/50"
                    data-admin={isAdmin}
                    data-price-error={hasPriceError}
                    data-unmapped={isUnmapped}
                    key={product.id}
                    onClick={(e) => {
                      if (!isAdmin) {
                        return
                      }
                      if (!shouldToggleRowSelection(e)) {
                        return
                      }
                      onSelectItem?.(product.id, !isSelected)
                    }}
                  >
                    {isAdmin && (
                      <TableSelectionCell
                        aria-label={`${product.productCode} 선택`}
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectItem?.(product.id, checked)}
                      />
                    )}
                    <TableCell>
                      <code className="text-sm font-mono text-slate-700">{product.productCode}</code>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{product.productName}</p>
                        {product.optionName.trim().length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-slate-500">{product.optionName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingCostProductId === product.id ? (
                        <Input
                          autoFocus
                          className="w-24 h-8 text-right"
                          onBlur={() => handleCostSave(product.id)}
                          onChange={(e) => setCostInputValue(e.target.value)}
                          onKeyDown={(e) => handleCostKeyDown(e, product.id)}
                          type="number"
                          value={costInputValue}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-end gap-1 cursor-pointer group"
                          data-row-select-ignore
                          onClick={() => handleCostEdit(product.id, product.cost)}
                        >
                          {hasPriceError && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">원가가 판매가보다 높습니다</p>
                                <p className="text-xs text-slate-400">
                                  원가: {formatCurrency(product.cost)} / 판매가: {formatCurrency(product.price)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <span
                            className="font-medium tabular-nums data-[price-error=true]:text-rose-600 data-[has-cost=true]:text-slate-900 data-[has-cost=false]:text-slate-400"
                            data-has-cost={product.cost > 0}
                            data-price-error={hasPriceError}
                          >
                            {product.cost > 0 ? formatCurrency(product.cost) : '미등록'}
                          </span>
                          <Pencil className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingShippingFeeProductId === product.id ? (
                        <Input
                          autoFocus
                          className="w-24 h-8 text-right"
                          onBlur={() => handleShippingFeeSave(product.id)}
                          onChange={(e) => setShippingFeeInputValue(e.target.value)}
                          onKeyDown={(e) => handleShippingFeeKeyDown(e, product.id)}
                          type="number"
                          value={shippingFeeInputValue}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-end gap-1 cursor-pointer group"
                          data-row-select-ignore
                          onClick={() => handleShippingFeeEdit(product.id, product.shippingFee)}
                        >
                          <span
                            className="font-medium tabular-nums data-[has-shipping-fee=true]:text-slate-900 data-[has-shipping-fee=false]:text-slate-400"
                            data-has-shipping-fee={product.shippingFee > 0}
                          >
                            {product.shippingFee > 0 ? formatCurrency(product.shippingFee) : '미등록'}
                          </span>
                          <Pencil className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Select
                          defaultValue={product.manufacturerId?.toString() || 'none'}
                          onValueChange={(value) => handleManufacturerChange(product.id, value)}
                        >
                          <SelectTrigger className="w-[180px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-slate-500">미지정</span>
                            </SelectItem>
                            {manufacturers.map((m) => (
                              <SelectItem key={m.id} value={m.id.toString()}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : isUnmapped ? (
                        <Button
                          className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => setEditingProductId(product.id)}
                          size="sm"
                          variant="outline"
                        >
                          <Info className="h-4 w-4" />
                          연결 필요
                        </Button>
                      ) : (
                        <div
                          className="flex items-center justify-center gap-2 cursor-pointer group"
                          data-row-select-ignore
                          onClick={() => setEditingProductId(product.id)}
                        >
                          <Badge className="bg-slate-100 text-slate-700 group-hover:bg-slate-200" variant="secondary">
                            {product.manufacturerName}
                          </Badge>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500" title={formatDateTime(product.updatedAt)}>
                      {formatRelativeTime(product.updatedAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TooltipProvider>
            {products.length === 0 && (
              <TableRow>
                <TableCell className="h-32 text-center text-slate-500" colSpan={isAdmin ? 8 : 7}>
                  상품이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// 원가가 판매가보다 높은지 검증
function hasPriceValidationError(product: Product): boolean {
  return product.cost > 0 && product.price > 0 && product.cost > product.price
}
