'use server'

import { eq } from 'drizzle-orm'

import type {
  ManufacturerExcelImportResult,
  ManufacturerExcelRowError,
} from '@/components/manufacturer/manufacturer-excel.types'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { readXlsxRowsFromFile } from '@/lib/excel/read'

type CanonicalField = 'contactName' | 'emails' | 'name' | 'phone'

export async function importManufacturersExcel(
  _prevState: ManufacturerExcelImportResult | null,
  formData: FormData,
): Promise<ManufacturerExcelImportResult> {
  try {
    const fileValue = formData.get('file')
    if (!isFileValue(fileValue)) {
      return { error: '엑셀 파일을 선택해 주세요.' }
    }

    if (fileValue.size === 0) {
      return { error: '빈 파일이에요.' }
    }

    if (!fileValue.name.toLowerCase().endsWith('.xlsx')) {
      return { error: '엑셀(.xlsx) 파일만 업로드할 수 있어요.' }
    }

    let rows: string[][]
    try {
      rows = await readXlsxRowsFromFile(fileValue)
    } catch (err) {
      console.error('importManufacturersExcel read error:', err)
      return { error: '엑셀 파일을 읽지 못했어요. 파일을 확인해 주세요.' }
    }

    const headerRowIndex = rows.findIndex((row) => row.some((cell) => cell.trim() !== ''))
    if (headerRowIndex < 0) {
      return { error: '엑셀 파일에 헤더가 없어요.' }
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
        contactName: manufacturer.contactName,
        emails: manufacturer.emails,
        phone: manufacturer.phone,
      })
      .from(manufacturer)

    const existingByName = new Map<
      string,
      { contactName: string | null; emails: string[]; id: number; name: string; phone: string | null }
    >()
    for (const m of existingRows) {
      existingByName.set(normalizeName(m.name), {
        id: m.id,
        name: m.name,
        contactName: m.contactName ?? null,
        emails: Array.isArray(m.emails) ? m.emails : [],
        phone: m.phone ?? null,
      })
    }

    const errors: ManufacturerExcelRowError[] = []
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
        errors.push({ row: rowNumber, name, message: '엑셀 안에서 제조사명이 중복돼요.' })
        continue
      }
      seenInputNames.add(name)

      const contactName = normalizeOptionalCell(getCell(row, indexByField.get('contactName')))
      const emailsRaw = normalizeOptionalCell(getCell(row, indexByField.get('emails')))
      const emails = parseEmails(emailsRaw)
      const phone = normalizeOptionalCell(getCell(row, indexByField.get('phone')))

      if (emails) {
        const hasInvalid = emails.some((email) => !isValidEmail(email))
        if (hasInvalid) {
          skipped += 1
          errors.push({ row: rowNumber, name, message: '이메일 형식이 올바르지 않아요.' })
          continue
        }
      }

      const existing = existingByName.get(name)

      if (existing) {
        const set: Partial<typeof manufacturer.$inferInsert> = {}

        if (contactName && contactName !== (existing.contactName ?? '')) {
          set.contactName = contactName
        }

        if (emails) {
          const normalizedExisting = normalizeEmailList(existing.emails)
          const normalizedNext = normalizeEmailList(emails)
          if (!isSameStringArray(normalizedExisting, normalizedNext)) {
            set.emails = normalizedNext
          }
        }

        if (phone && phone !== (existing.phone ?? '')) {
          set.phone = phone
        }

        if (Object.keys(set).length === 0) {
          skipped += 1
          continue
        }

        set.updatedAt = new Date()

        await db.update(manufacturer).set(set).where(eq(manufacturer.id, existing.id))
        updated += 1

        existingByName.set(name, {
          ...existing,
          contactName: set.contactName ?? existing.contactName,
          emails: set.emails ?? existing.emails,
          phone: set.phone ?? existing.phone,
        })

        continue
      }

      try {
        const [inserted] = await db
          .insert(manufacturer)
          .values({
            name,
            contactName: contactName ?? '',
            emails: emails ?? [],
            phone: phone ?? '',
            orderCount: 0,
          })
          .returning({ id: manufacturer.id })

        if (inserted?.id != null) {
          existingByName.set(name, {
            id: inserted.id,
            name,
            contactName: contactName ?? null,
            emails: emails ?? [],
            phone: phone ?? null,
          })
        }

        created += 1
      } catch (err) {
        // Unique(name) 충돌 등으로 insert가 실패하면, 존재하는지 확인 후 update로 시도해요.
        console.error('importManufacturersExcel insert error:', err)

        const [found] = await db.select({ id: manufacturer.id }).from(manufacturer).where(eq(manufacturer.name, name))
        if (!found) {
          skipped += 1
          errors.push({ row: rowNumber, name, message: '제조사를 저장하지 못했어요.' })
          continue
        }

        const fallbackExisting = existingByName.get(name) ?? {
          id: found.id,
          name,
          contactName: null,
          emails: [],
          phone: null,
        }
        existingByName.set(name, fallbackExisting)

        const set: Partial<typeof manufacturer.$inferInsert> = {}

        if (contactName && contactName !== (fallbackExisting.contactName ?? '')) {
          set.contactName = contactName
        }

        if (emails) {
          const normalizedExisting = normalizeEmailList(fallbackExisting.emails)
          const normalizedNext = normalizeEmailList(emails)
          if (!isSameStringArray(normalizedExisting, normalizedNext)) {
            set.emails = normalizedNext
          }
        }

        if (phone && phone !== (fallbackExisting.phone ?? '')) {
          set.phone = phone
        }

        if (Object.keys(set).length === 0) {
          skipped += 1
          continue
        }

        set.updatedAt = new Date()

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
    console.error('importManufacturersExcel:', err)
    return { error: '엑셀을 처리하지 못했어요. 파일 내용을 확인해 주세요.' }
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
  if (hNoSpace === '이메일' || normalized === 'email' || normalized === 'emails') return 'emails'
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

function isSameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeEmailList(emails: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  for (const raw of emails) {
    const trimmed = raw.trim().toLowerCase()
    if (!trimmed) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }

  return out
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

function parseEmails(value: string | undefined): string[] | undefined {
  if (!value) return undefined

  const parts = value
    .split(/[,;\n]+/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length === 0) return undefined

  const out: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    const normalized = part.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }

  return out
}


