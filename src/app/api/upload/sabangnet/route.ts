import { count, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'
import { order, upload } from '@/db/schema/orders'
import { groupOrdersByManufacturer } from '@/lib/excel'

import type { UploadError } from '../type'

import {
  autoCreateManufacturers,
  autoCreateProducts,
  autoCreateUnmappedOptionCandidates,
  buildLookupMaps,
  calculateManufacturerBreakdown,
  calculateSummary,
  matchManufacturerId,
  VALID_EXTENSIONS,
} from '../common'
import { parseSabangnetFile } from './excel'
import { mapOrderValues, type UploadResult } from './util'

export const maxDuration = 60

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

    if (parseResult.errors.length > 0) {
      const first = parseResult.errors[0]
      const hint =
        first && first.row > 0 ? ` (예: ${first.row}행 - ${first.message})` : first ? ` (예: ${first.message})` : ''

      // 올-오어-낫싱: 검증 오류가 있으면 주문을 저장하지 않아요.
      await db.insert(upload).values({
        fileName: file.name,
        fileSize: file.size,
        fileType: 'sabangnet',
        totalOrders: Math.max(0, parseResult.totalRows - 1),
        processedOrders: 0,
        errorOrders: parseResult.errors.length,
        status: 'error',
      })

      return NextResponse.json(
        { error: `파일에 오류가 ${parseResult.errors.length}건 있어서 업로드할 수 없어요.${hint}` },
        { status: 400 },
      )
    }

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

    const { insertedCount, autoCreatedManufacturers } = await db.transaction(async (tx) => {
      const [uploadRecord] = await tx
        .insert(upload)
        .values({
          fileName: file.name,
          fileSize: file.size,
          fileType: 'sabangnet',
          totalOrders: parseResult.totalRows - 1,
          processedOrders: 0,
          errorOrders: 0,
          status: 'processing',
        })
        .returning()

      const createdManufacturerNames = await autoCreateManufacturers({
        orders: parseResult.orders,
        lookupMaps,
        tx,
      })

      await autoCreateUnmappedOptionCandidates({
        orders: parseResult.orders,
        lookupMaps,
        tx,
      })

      const orderValues = mapOrderValues({
        orders: parseResult.orders,
        uploadId: uploadRecord.id,
        lookupMaps,
      })

      if (orderValues.length === 0) {
        await tx.update(upload).set({ status: 'completed', processedOrders: 0 }).where(eq(upload.id, uploadRecord.id))
        return {
          insertedCount: 0,
          autoCreatedManufacturers: createdManufacturerNames,
        }
      }

      await autoCreateProducts({ orderValues, tx })

      // NOTE: 대량 업로드(수천~수만 건)에서 Drizzle이 단일 INSERT 쿼리를 만들다가 스택오버/파라미터 제한에 걸릴 수 있어요.
      // 그래서 안전한 크기로 쪼개서 INSERT 해요.
      const CHUNK_SIZE = 1_800
      for (let start = 0; start < orderValues.length; start += CHUNK_SIZE) {
        const chunk = orderValues.slice(start, start + CHUNK_SIZE)
        await tx.insert(order).values(chunk).onConflictDoNothing({ target: order.sabangnetOrderNumber })
      }

      const [{ insertedCount }] = await tx
        .select({ insertedCount: count() })
        .from(order)
        .where(eq(order.uploadId, uploadRecord.id))

      await tx
        .update(upload)
        .set({ status: 'completed', processedOrders: insertedCount })
        .where(eq(upload.id, uploadRecord.id))

      return {
        insertedCount,
        autoCreatedManufacturers: createdManufacturerNames,
      }
    })

    const duplicateCount = parseResult.orders.length - insertedCount
    const manufacturerNameById = new Map<number, string>()
    for (const mfr of lookupMaps.manufacturerMap.values()) {
      manufacturerNameById.set(mfr.id, mfr.name)
    }

    const ordersForBreakdown = parseResult.orders.map((o) => {
      const matchedManufacturerId = matchManufacturerId(o, lookupMaps)
      if (matchedManufacturerId == null) {
        return o
      }
      const resolvedName = manufacturerNameById.get(matchedManufacturerId)
      return resolvedName ? { ...o, manufacturer: resolvedName } : o
    })

    const groupedOrders = groupOrdersByManufacturer(ordersForBreakdown)
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
      summary,
      autoCreatedManufacturers,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    const errorMessage = error instanceof Error ? error.message : '사방넷 파일을 업로드하지 못했어요'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
