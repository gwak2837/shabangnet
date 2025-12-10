import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'
import { order, upload } from '@/db/schema/orders'
import { exclusionPattern, settings } from '@/db/schema/settings'
import { groupOrdersByManufacturer } from '@/lib/excel'

import { parseSabangnetFile } from './excel'
import {
  buildLookupMaps,
  calculateManufacturerBreakdown,
  calculateSummary,
  createExclusionChecker,
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
})

export async function POST(request: Request): Promise<NextResponse<UploadResult | { error: string }>> {
  try {
    const formData = await request.formData()
    const validation = uploadFormSchema.safeParse({ file: formData.get('file') })

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 })
    }

    const { file } = validation.data
    const buffer = await file.arrayBuffer()
    const parseResult = await parseSabangnetFile(buffer)

    if (parseResult.orders.length === 0 && parseResult.errors.length > 0) {
      return NextResponse.json({ error: parseResult.errors[0].message }, { status: 400 })
    }

    const [allManufacturers, allProducts, allOptionMappings, [exclusionEnabledSetting], allPatterns] =
      await Promise.all([
        db
          .select({
            id: manufacturer.id,
            name: manufacturer.name,
          })
          .from(manufacturer),
        db
          .select({
            productCode: product.productCode,
            manufacturerId: product.manufacturerId,
          })
          .from(product),
        db
          .select({
            productCode: optionMapping.productCode,
            optionName: optionMapping.optionName,
            manufacturerId: optionMapping.manufacturerId,
          })
          .from(optionMapping),
        db
          .select({
            value: settings.value,
          })
          .from(settings)
          .where(eq(settings.key, 'exclusion_enabled')),
        db
          .select({
            enabled: exclusionPattern.enabled,
            description: exclusionPattern.description,
            pattern: exclusionPattern.pattern,
          })
          .from(exclusionPattern)
          .orderBy(exclusionPattern.createdAt),
      ])

    const lookupMaps = buildLookupMaps(allManufacturers, allProducts, allOptionMappings)
    const exclusionEnabled = exclusionEnabledSetting?.value ? JSON.parse(exclusionEnabledSetting.value) === true : true
    const enabledPatterns = exclusionEnabled ? allPatterns.filter((p) => p.enabled) : []
    const checkExclusionPattern = createExclusionChecker(enabledPatterns)

    const { insertedCount } = await db.transaction(async (tx) => {
      const [uploadRecord] = await tx
        .insert(upload)
        .values({
          fileName: file.name,
          fileSize: file.size,
          fileType: 'sabangnet',
          totalOrders: parseResult.totalRows - 1,
          processedOrders: parseResult.orders.length,
          errorOrders: parseResult.errors.length,
          status: 'completed',
        })
        .returning()

      const orderValues = prepareOrderValues({
        orders: parseResult.orders,
        uploadId: uploadRecord.id,
        lookupMaps,
        checkExclusionPattern,
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
    const errorMessage = error instanceof Error ? error.message : '사방넷 파일을 업로드하지 못했어요'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
