'use server'

import { eq } from 'drizzle-orm'

import type {
  ManufacturerCsvImportResult,
  ManufacturerCsvRowError,
} from '@/components/manufacturer/manufacturer-csv.types'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { parseCsv } from '@/utils/csv'

type CanonicalField = 'ccEmail' | 'contactName' | 'email' | 'name' | 'phone'

export async function importManufacturersCsv(
  _prevState: ManufacturerCsvImportResult | null,
  formData: FormData,
): Promise<ManufacturerCsvImportResult> {
  try {
    const fileValue = formData.get('file')
    if (!isFileValue(fileValue)) {
      return { error: 'CSV 파일을 선택해 주세요.' }
    }

    if (fileValue.size === 0) {
      return { error: '빈 파일이에요.' }
    }

    const rawText = await fileValue.text()
    const rows = parseCsv(rawText)

    const headerRowIndex = rows.findIndex((row) => row.some((cell) => cell.trim() !== ''))
    if (headerRowIndex < 0) {
      return { error: 'CSV에 헤더가 없어요.' }
    }

    const headerRow = rows[headerRowIndex]!.map(normalizeHeaderCell)
    const dataRows = rows.slice(headerRowIndex + 1)

    const indexByField = new Map<CanonicalField, number>()
    for (let i = 0; i < headerRow.length; i += 1) {
      const field = headerToCanonicalField(headerRow[i] ?? '')
      if (!field) continue
      if (indexByField.has(field)) continue
      indexByField.set(field, i)
    }

    const nameIndex = indexByField.get('name')
    if (nameIndex == null) {
      return { error: '헤더에 제조사명이 필요해요. (예: 제조사명 또는 name)' }
    }

    const existingRows = await db
      .select({
        id: manufacturer.id,
        name: manufacturer.name,
      })
      .from(manufacturer)

    const existingByName = new Map<string, number>()
    for (const m of existingRows) {
      existingByName.set(normalizeName(m.name), m.id)
    }

    const errors: ManufacturerCsvRowError[] = []
    const seenInputNames = new Set<string>()

    let totalRows = 0
    let created = 0
    let updated = 0
    let skipped = 0

    for (let i = 0; i < dataRows.length; i += 1) {
      const row = dataRows[i] ?? []
      const rowNumber = headerRowIndex + 2 + i

      const isEmptyRow = row.every((cell) => cell.trim() === '')
      if (isEmptyRow) {
        continue
      }

      totalRows += 1

      const rawName = getCell(row, nameIndex)
      const name = normalizeName(rawName)
      if (!name) {
        skipped += 1
        errors.push({ row: rowNumber, message: '제조사명이 비어 있어요.' })
        continue
      }

      if (seenInputNames.has(name)) {
        skipped += 1
        errors.push({ row: rowNumber, name, message: 'CSV 안에서 제조사명이 중복돼요.' })
        continue
      }
      seenInputNames.add(name)

      const contactName = normalizeOptionalCell(getCell(row, indexByField.get('contactName')))
      const email = normalizeOptionalCell(getCell(row, indexByField.get('email')))
      const ccEmail = normalizeOptionalCell(getCell(row, indexByField.get('ccEmail')))
      const phone = normalizeOptionalCell(getCell(row, indexByField.get('phone')))

      if (email && !isValidEmail(email)) {
        skipped += 1
        errors.push({ row: rowNumber, name, message: '이메일 형식이 올바르지 않아요.' })
        continue
      }
      if (ccEmail && !isValidEmail(ccEmail)) {
        skipped += 1
        errors.push({ row: rowNumber, name, message: 'CC이메일 형식이 올바르지 않아요.' })
        continue
      }

      const existingId = existingByName.get(name)

      if (existingId != null) {
        const set: Partial<typeof manufacturer.$inferInsert> = {
          updatedAt: new Date(),
        }

        // 빈 칸은 기존 값 유지: 값이 있을 때만 업데이트해요.
        if (contactName) set.contactName = contactName
        if (email) set.email = email
        if (ccEmail) set.ccEmail = ccEmail
        if (phone) set.phone = phone

        const changeKeys = Object.keys(set).filter((k) => k !== 'updatedAt')
        if (changeKeys.length === 0) {
          skipped += 1
          continue
        }

        await db.update(manufacturer).set(set).where(eq(manufacturer.id, existingId))
        updated += 1
        continue
      }

      try {
        const [inserted] = await db
          .insert(manufacturer)
          .values({
            name,
            contactName: contactName ?? '',
            email: email ?? null,
            ccEmail: ccEmail ?? null,
            phone: phone ?? '',
            orderCount: 0,
          })
          .returning({ id: manufacturer.id })

        if (inserted?.id != null) {
          existingByName.set(name, inserted.id)
        }

        created += 1
      } catch (err) {
        // Unique(name) 충돌 등으로 insert가 실패하면, 존재하는지 확인 후 update로 시도해요.
        console.error('importManufacturersCsv insert error:', err)

        const [found] = await db.select({ id: manufacturer.id }).from(manufacturer).where(eq(manufacturer.name, name))
        if (!found) {
          skipped += 1
          errors.push({ row: rowNumber, name, message: '제조사를 저장하지 못했어요.' })
          continue
        }

        existingByName.set(name, found.id)

        const set: Partial<typeof manufacturer.$inferInsert> = {
          updatedAt: new Date(),
        }
        if (contactName) set.contactName = contactName
        if (email) set.email = email
        if (ccEmail) set.ccEmail = ccEmail
        if (phone) set.phone = phone

        const changeKeys = Object.keys(set).filter((k) => k !== 'updatedAt')
        if (changeKeys.length === 0) {
          skipped += 1
          continue
        }

        await db.update(manufacturer).set(set).where(eq(manufacturer.id, found.id))
        updated += 1
      }
    }

    return {
      success: true,
      totalRows,
      created,
      updated,
      skipped,
      errors,
    }
  } catch (err) {
    console.error('importManufacturersCsv:', err)
    return { error: 'CSV를 처리하지 못했어요. 파일 내용을 확인해 주세요.' }
  }
}

function getCell(row: string[], index: number | undefined): string {
  if (index == null) return ''
  return row[index] ?? ''
}

function headerToCanonicalField(header: string): CanonicalField | null {
  const h = header.trim()
  const hNoSpace = h.replaceAll(' ', '')
  const normalized = hNoSpace.toLowerCase().replaceAll('_', '').replaceAll('-', '')

  if (hNoSpace === '제조사명' || hNoSpace === '제조사' || normalized === 'name') return 'name'
  if (hNoSpace === '담당자명' || hNoSpace === '담당자' || normalized === 'contactname') return 'contactName'
  if (hNoSpace === '이메일' || normalized === 'email') return 'email'
  if (
    normalized === 'cc이메일' ||
    normalized === '참조이메일' ||
    normalized === '참조이메일(cc)' ||
    normalized === 'ccemail'
  )
    return 'ccEmail'
  if (hNoSpace === '휴대전화번호' || hNoSpace === '전화번호' || normalized === 'phone' || normalized === 'mobile')
    return 'phone'

  return null
}

function isFileValue(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof (value as File).arrayBuffer === 'function'
  )
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeHeaderCell(value: string): string {
  return value.trim().replaceAll('\u00a0', ' ')
}

function normalizeName(value: string): string {
  return value.trim()
}

function normalizeOptionalCell(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}
