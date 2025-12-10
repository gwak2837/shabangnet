import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

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
  validateExcelFile,
} from './util'

export async function POST(request: Request): Promise<NextResponse<UploadResult | { error: string }>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '파일이 없거나 유효하지 않아요' }, { status: 400 })
    }

    const validation = validateExcelFile(file)

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error! }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const parseResult = await parseSabangnetFile(buffer)

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
