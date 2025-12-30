import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { PassThrough, Readable } from 'node:stream'
import { z } from 'zod'

import { db } from '@/db/client'
import { upload } from '@/db/schema/orders'
import { shoppingMallTemplate } from '@/db/schema/settings'
import { auth } from '@/lib/auth'
import { formatDateForFileName } from '@/lib/excel'

import type { ShoppingMallUploadTemplate } from './template'
import type { ShoppingMallUploadMetaV1 } from './types'

import { VALID_EXTENSIONS } from '../common'
import {
  applyProductUpserts,
  autoCreateManufacturersFromNames,
  autoCreateUnmappedOptionCandidates,
} from './db-side-effects'
import { convertShoppingMallWorkbookToStream, preflightShoppingMallWorkbook } from './excel'
import { getShoppingMallUploadTemplate } from './template'

export const maxDuration = 60

const uploadFormSchema = z.object({
  file: z
    .instanceof(File, { message: '파일이 없거나 유효하지 않아요' })
    .refine((file) => VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)), {
      message: '.xlsx, .xls 엑셀 파일만 업로드 가능해요',
    }),
  mallId: z.coerce.number({ message: '쇼핑몰을 선택해주세요' }).min(1, '쇼핑몰을 선택해주세요'),
})

export async function GET(): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

export async function POST(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()

  const validation = uploadFormSchema.safeParse({
    file: formData.get('file'),
    mallId: formData.get('mall-id'),
  })

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 })
  }

  const { file, mallId } = validation.data

  try {
    const templateResult = await getShoppingMallUploadTemplate(mallId)
    if (!templateResult.ok) {
      return NextResponse.json({ error: templateResult.error }, { status: templateResult.status })
    }

    const template = templateResult.template
    const buffer = Buffer.from(await file.arrayBuffer())

    const preflight = await preflightShoppingMallWorkbook({ buffer, template })
    if (!preflight.ok) {
      const meta: ShoppingMallUploadMetaV1 = {
        v: 1,
        kind: 'shopping_mall_upload_meta',
        mallName: template.displayName,
        summary: { totalAmount: 0, totalCost: 0, estimatedMargin: null },
        errorSamples: [{ row: 0, message: preflight.error }],
        autoCreatedManufacturers: [],
      }

      await db.insert(upload).values({
        fileName: file.name,
        fileSize: file.size,
        fileType: 'shopping_mall',
        shoppingMallId: mallId,
        totalOrders: 0,
        processedOrders: 0,
        errorOrders: 1,
        status: 'error',
        meta,
      })

      return NextResponse.json({ error: preflight.error }, { status: 400 })
    }

    const [uploadRecord] = await db
      .insert(upload)
      .values({
        fileName: file.name,
        fileSize: file.size,
        fileType: 'shopping_mall',
        shoppingMallId: mallId,
        totalOrders: 0,
        processedOrders: 0,
        errorOrders: 0,
        status: 'processing',
        meta: null,
      })
      .returning()

    const downloadName = encodeURIComponent(
      `${template.displayName}_${formatDateForFileName(uploadRecord.uploadedAt)}.xlsx`,
    )

    const stream = new PassThrough()
    const response = new Response(Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'X-Upload-Id': String(uploadRecord.id),
      },
    })

    void finalizeShoppingMallUpload({
      buffer,
      fileName: file.name,
      fileSize: file.size,
      mallId,
      preflight,
      stream,
      template,
      uploadId: uploadRecord.id,
    })

    return response
  } catch (error) {
    console.error(error)
    const errorMessage = error instanceof Error ? error.message : '쇼핑몰 파일을 업로드하지 못했어요'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

async function finalizeShoppingMallUpload(params: {
  buffer: Buffer
  fileName: string
  fileSize: number
  mallId: number
  preflight: Exclude<Awaited<ReturnType<typeof preflightShoppingMallWorkbook>>, { ok: false }>
  stream: PassThrough
  template: ShoppingMallUploadTemplate
  uploadId: number
}): Promise<void> {
  try {
    const conversion = await convertShoppingMallWorkbookToStream({
      buffer: params.buffer,
      preflight: params.preflight,
      stream: params.stream,
      template: params.template,
    })

    const createdNames = await db.transaction(async (tx) => {
      const { createdNames, manufacturerIdByLowerName } = await autoCreateManufacturersFromNames({
        names: conversion.manufacturerNames,
        tx,
      })

      await autoCreateUnmappedOptionCandidates({ candidates: conversion.optionCandidates, tx })
      await applyProductUpserts({ manufacturerIdByLowerName, products: conversion.products, tx })

      return createdNames
    })

    const meta: ShoppingMallUploadMetaV1 = {
      v: 1,
      kind: 'shopping_mall_upload_meta',
      mallName: params.template.displayName,
      summary: conversion.summary,
      errorSamples: conversion.errorSamples,
      autoCreatedManufacturers: createdNames,
    }

    await db
      .update(upload)
      .set({
        status: 'completed',
        totalOrders: conversion.totalOrders,
        processedOrders: conversion.processedOrders,
        errorOrders: conversion.errorOrders,
        meta,
      })
      .where(eq(upload.id, params.uploadId))
  } catch (error) {
    console.error(error)
    const errorMessage = error instanceof Error ? error.message : '쇼핑몰 파일을 업로드하지 못했어요'

    const meta: ShoppingMallUploadMetaV1 = {
      v: 1,
      kind: 'shopping_mall_upload_meta',
      mallName: params.template.displayName,
      summary: { totalAmount: 0, totalCost: 0, estimatedMargin: null },
      errorSamples: [{ row: 0, message: errorMessage }],
      autoCreatedManufacturers: [],
    }

    await db
      .update(upload)
      .set({
        status: 'error',
        totalOrders: 0,
        processedOrders: 0,
        errorOrders: 1,
        meta,
      })
      .where(eq(upload.id, params.uploadId))
  }
}
