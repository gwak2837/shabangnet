'use client'

import { AlertCircle, AlertTriangle, Check, Package, Pencil } from 'lucide-react'
import { useState } from 'react'

import type { Manufacturer } from '@/services/db/manufacturers'
import type { Product } from '@/services/db/products'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency, formatDate } from '@/utils/format'

interface ProductTableProps {
  manufacturers: Manufacturer[]
  onUpdateCost?: (productId: string, cost: number) => void
  onUpdateManufacturer: (productId: string, manufacturerId: string | null) => void
  products: Product[]
}

export function ProductTable({ products, manufacturers, onUpdateManufacturer, onUpdateCost }: ProductTableProps) {
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingCostProductId, setEditingCostProductId] = useState<string | null>(null)
  const [costInputValue, setCostInputValue] = useState<string>('')

  function handleManufacturerChange(productId: string, value: string) {
    onUpdateManufacturer(productId, value === 'none' ? null : value)
    setEditingProductId(null)
  }

  function handleCostEdit(productId: string, currentCost: number) {
    setEditingCostProductId(productId)
    setCostInputValue(currentCost.toString())
  }

  function handleCostSave(productId: string) {
    const cost = parseFloat(costInputValue) || 0
    if (onUpdateCost) {
      onUpdateCost(productId, cost)
    }
    setEditingCostProductId(null)
    setCostInputValue('')
  }

  function handleCostKeyDown(e: React.KeyboardEvent, productId: string) {
    if (e.key === 'Enter') {
      handleCostSave(productId)
    } else if (e.key === 'Escape') {
      setEditingCostProductId(null)
      setCostInputValue('')
    }
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상품코드</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상품명</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">옵션</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                판매가
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                원가
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TooltipProvider>
              {products.map((product) => {
                const isUnmapped = !product.manufacturerId
                const isEditing = editingProductId === product.id
                const hasPriceError = hasPriceValidationError(product)

                return (
                  <TableRow
                    className={`hover:bg-slate-50 transition-colors ${isUnmapped ? 'bg-amber-50/50' : ''} ${hasPriceError ? 'bg-rose-50/50' : ''}`}
                    key={product.id}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100">
                          <Package className="h-4 w-4 text-slate-500" />
                        </div>
                        <code className="text-sm font-mono text-slate-700">{product.productCode}</code>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{product.productName}</TableCell>
                    <TableCell className="text-slate-600">{product.optionName}</TableCell>
                    <TableCell className="text-right font-medium text-slate-900">
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
                            className={`font-medium ${hasPriceError ? 'text-rose-600' : product.cost > 0 ? 'text-slate-900' : 'text-slate-400'}`}
                          >
                            {product.cost > 0 ? formatCurrency(product.cost) : '미등록'}
                          </span>
                          <Pencil className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          defaultValue={product.manufacturerId || 'none'}
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
                              <SelectItem key={m.id} value={m.id}>
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
                          <AlertCircle className="h-4 w-4" />
                          매핑 필요
                        </Button>
                      ) : (
                        <div
                          className="flex items-center gap-2 cursor-pointer group"
                          onClick={() => setEditingProductId(product.id)}
                        >
                          <Badge className="bg-slate-100 text-slate-700 group-hover:bg-slate-200" variant="secondary">
                            {product.manufacturerName}
                          </Badge>
                          <Check className="h-4 w-4 text-emerald-500" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{formatDate(product.updatedAt)}</TableCell>
                  </TableRow>
                )
              })}
            </TooltipProvider>
            {products.length === 0 && (
              <TableRow>
                <TableCell className="h-32 text-center text-slate-500" colSpan={7}>
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
