import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'
import { order, upload } from '@/db/schema/orders'
import { shoppingMallTemplate } from '@/db/schema/settings'
import { groupOrdersByManufacturer } from '@/lib/excel'

import { parseShoppingMallFile } from './excel'
import {
  buildLookupMaps,
  calculateManufacturerBreakdown,
  calculateSummary,
  prepareOrderValues,
  type UploadError,
  type UploadResult,
} from './util'

const VALID_EXTENSIONS = ['.xlsx', '.xls']

const uploadFormSchema = z.object({
  file: z
    .instanceof(File, { message: '파일이 없거나 유효하지 않아요' })
    .refine((file) => VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)), {
      message: '.xlsx, .xls 엑셀 파일만 업로드 가능해요',
    }),
  'mall-id': z.coerce.number({ message: '쇼핑몰을 선택해주세요' }).min(1, '쇼핑몰을 선택해주세요'),
})

export async function GET(): Promise<NextResponse> {
  const templates = await db
    .select({
      id: shoppingMallTemplate.id,
      name: shoppingMallTemplate.mallName,
      displayName: shoppingMallTemplate.displayName,
    })
    .from(shoppingMallTemplate)
    .where(eq(shoppingMallTemplate.enabled, true))
    .orderBy(shoppingMallTemplate.displayName)

  return NextResponse.json({ malls: templates })
}

export async function POST(request: Request): Promise<NextResponse<UploadResult | { error: string }>> {
  try {
    const formData = await request.formData()
    const validation = uploadFormSchema.safeParse(formData)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 })
    }

    const { file, 'mall-id': mallId } = validation.data

    const [dbTemplate] = await db
      .select({
        mallName: shoppingMallTemplate.mallName,
        displayName: shoppingMallTemplate.displayName,
        headerRow: shoppingMallTemplate.headerRow,
        dataStartRow: shoppingMallTemplate.dataStartRow,
        columnMappings: shoppingMallTemplate.columnMappings,
      })
      .from(shoppingMallTemplate)
      .where(eq(shoppingMallTemplate.id, mallId))

    if (!dbTemplate) {
      return NextResponse.json({ error: '알 수 없는 쇼핑몰이에요' }, { status: 400 })
    }

    const mallConfig = {
      mallName: dbTemplate.mallName,
      displayName: dbTemplate.displayName,
      headerRow: dbTemplate.headerRow ?? 1,
      dataStartRow: dbTemplate.dataStartRow ?? 2,
      columnMappings:
        typeof dbTemplate.columnMappings === 'string'
          ? (JSON.parse(dbTemplate.columnMappings) as Record<string, string>)
          : ((dbTemplate.columnMappings as Record<string, string> | null) ?? {}),
    }

    const buffer = await file.arrayBuffer()
    const parseResult = await parseShoppingMallFile(buffer, mallConfig)

    const [allManufacturers, allProducts, allOptionMappings] = await Promise.all([
      db.select({ id: manufacturer.id, name: manufacturer.name }).from(manufacturer),
      db.select({ productCode: product.productCode, manufacturerId: product.manufacturerId }).from(product),
      db
        .select({
          productCode: optionMapping.productCode,
          optionName: optionMapping.optionName,
          manufacturerId: optionMapping.manufacturerId,
        })
        .from(optionMapping),
    ])

    const lookupMaps = buildLookupMaps(allManufacturers, allProducts, allOptionMappings)

    const { insertedCount } = await db.transaction(async (tx) => {
      const [uploadRecord] = await tx
        .insert(upload)
        .values({
          fileName: file.name,
          fileSize: file.size,
          fileType: 'shopping_mall',
          shoppingMallId: mallId,
          totalOrders: parseResult.totalRows - mallConfig.headerRow,
          processedOrders: parseResult.orders.length,
          errorOrders: parseResult.errors.length,
          status: 'completed',
        })
        .returning()

      const orderValues = prepareOrderValues({
        orders: parseResult.orders,
        uploadId: uploadRecord.id,
        lookupMaps,
        displayName: mallConfig.displayName,
      })

      if (orderValues.length === 0) {
        return { insertedCount: 0 }
      }

      const insertResult = await tx
        .insert(order)
        .values(orderValues)
        .onConflictDoNothing({ target: order.sabangnetOrderNumber })
        .returning({ id: order.id })

      return { insertedCount: insertResult.length }
    })

    const duplicateCount = parseResult.orders.length - insertedCount
    const groupedOrders = groupOrdersByManufacturer(parseResult.orders)
    const manufacturerBreakdown = calculateManufacturerBreakdown(groupedOrders)
    const summary = calculateSummary(manufacturerBreakdown)

    const errors: UploadError[] = parseResult.errors.map((err) => ({
      row: err.row,
      message: err.message,
      productCode: err.data?.productCode as string | undefined,
      productName: err.data?.productName as string | undefined,
    }))

    const result: UploadResult = {
      mallName: mallConfig.displayName,
      processedOrders: insertedCount,
      duplicateOrders: duplicateCount,
      errorOrders: parseResult.errors.length,
      manufacturerBreakdown,
      errors,
      orderNumbers: parseResult.orders.map((o) => o.sabangnetOrderNumber),
      summary,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    const errorMessage = error instanceof Error ? error.message : '쇼핑몰 파일을 업로드하지 못했어요'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
