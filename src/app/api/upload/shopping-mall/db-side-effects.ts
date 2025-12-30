import { inArray, sql } from 'drizzle-orm'

import type { Transaction } from '@/db/client'

import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'

import type { ShoppingMallProductAggregate } from './excel'

const INSERT_CHUNK_SIZE = 1_500
const UPDATE_CHUNK_SIZE = 2_000

export async function applyProductUpserts(params: {
  manufacturerIdByLowerName: Map<string, number>
  products: ShoppingMallProductAggregate[]
  tx: Transaction
}): Promise<void> {
  const base = params.products
    .map((p) => {
      const productCode = p.productCode.trim()
      const productName = p.productName.trim()
      if (!productCode || !productName) return null

      return {
        productCode,
        productName,
        optionName: p.optionName?.trim() || null,
        manufacturerName: p.manufacturerName?.trim() || null,
        price: Number.isFinite(p.price) ? Math.max(0, Math.round(p.price)) : 0,
        cost: Number.isFinite(p.cost) ? Math.max(0, Math.round(p.cost)) : 0,
      }
    })
    .filter((v): v is Exclude<typeof v, null> => v !== null)

  if (base.length === 0) {
    return
  }

  // Resolve manufacturerId:
  // - manufacturerName present: use manufacturerIdByLowerName
  // - else if optionName present: use option_mapping(product_code, option_name)
  // - else: fallback to existing product.manufacturer_id
  const manufacturerIdByOptionKey = new Map<string, number>()
  const optionPairsToLookup: Array<{ optionName: string; productCode: string }> = []
  const seenOptionKey = new Set<string>()

  const productCodesToLookup: string[] = []
  const seenProductCodeKey = new Set<string>()

  for (const p of base) {
    if (p.manufacturerName) {
      continue
    }

    const productCodeKey = p.productCode.toLowerCase()

    if (p.optionName) {
      const optionKey = `${productCodeKey}_${p.optionName.toLowerCase()}`
      if (seenOptionKey.has(optionKey)) continue
      seenOptionKey.add(optionKey)
      optionPairsToLookup.push({ productCode: p.productCode, optionName: p.optionName })
      continue
    }

    if (!seenProductCodeKey.has(productCodeKey)) {
      seenProductCodeKey.add(productCodeKey)
      productCodesToLookup.push(p.productCode)
    }
  }

  for (const group of chunk(optionPairsToLookup, UPDATE_CHUNK_SIZE)) {
    const tuples = group.map((p) => sql`(${p.productCode}, ${p.optionName})`)
    const rows = await params.tx.execute<{ manufacturerId: number; optionName: string; productCode: string }>(sql`
      SELECT
        product_code AS "productCode",
        option_name AS "optionName",
        manufacturer_id AS "manufacturerId"
      FROM option_mapping
      WHERE
        manufacturer_id IS NOT NULL
        AND (product_code, option_name) IN (${sql.join(tuples, sql`, `)})
    `)

    for (const r of rows) {
      manufacturerIdByOptionKey.set(`${r.productCode.toLowerCase()}_${r.optionName.toLowerCase()}`, r.manufacturerId)
    }
  }

  const manufacturerIdByProductCodeKey = new Map<string, number>()
  for (const group of chunk(productCodesToLookup, UPDATE_CHUNK_SIZE)) {
    const rows = await params.tx
      .select({
        productCode: product.productCode,
        manufacturerId: product.manufacturerId,
      })
      .from(product)
      .where(inArray(product.productCode, group))

    for (const r of rows) {
      if (r.manufacturerId != null) {
        manufacturerIdByProductCodeKey.set(r.productCode.toLowerCase(), r.manufacturerId)
      }
    }
  }

  const values = base.map((p) => {
    const manufacturerId = (() => {
      if (p.manufacturerName) {
        const key = p.manufacturerName.toLowerCase()
        return params.manufacturerIdByLowerName.get(key) ?? null
      }

      if (p.optionName) {
        const optionKey = `${p.productCode.toLowerCase()}_${p.optionName.toLowerCase()}`
        return manufacturerIdByOptionKey.get(optionKey) ?? null
      }

      return manufacturerIdByProductCodeKey.get(p.productCode.toLowerCase()) ?? null
    })()

    return {
      productCode: p.productCode,
      productName: p.productName,
      optionName: p.optionName,
      manufacturerId,
      price: p.price,
      cost: p.cost,
    }
  })

  // 1) Insert missing products
  for (const group of chunk(values, INSERT_CHUNK_SIZE)) {
    await params.tx.insert(product).values(group).onConflictDoNothing({ target: product.productCode })
  }

  // 2) Fill missing price/cost/manufacturerId/optionName (only when current value is empty/0/null)
  for (const group of chunk(values, UPDATE_CHUNK_SIZE)) {
    const now = new Date()

    const rows = group.map((v) => sql`(${v.productCode}, ${v.price}, ${v.cost}, ${v.manufacturerId}, ${v.optionName})`)

    await params.tx.execute(sql`
      UPDATE product AS p
      SET
        price = CASE
          WHEN p.price = 0 AND v.price > 0 THEN v.price
          ELSE p.price
        END,
        cost = CASE
          WHEN p.cost = 0 AND v.cost > 0 THEN v.cost
          ELSE p.cost
        END,
        manufacturer_id = COALESCE(p.manufacturer_id, v.manufacturer_id),
        option_name = CASE
          WHEN (p.option_name IS NULL OR p.option_name = '')
            AND v.option_name IS NOT NULL AND v.option_name <> '' THEN v.option_name
          ELSE p.option_name
        END,
        updated_at = ${now}
      FROM (
        VALUES ${sql.join(rows, sql`, `)}
      ) AS v(product_code, price, cost, manufacturer_id, option_name)
      WHERE
        p.product_code = v.product_code
        AND (
          (p.price = 0 AND v.price > 0)
          OR (p.cost = 0 AND v.cost > 0)
          OR (p.manufacturer_id IS NULL AND v.manufacturer_id IS NOT NULL)
          OR ((p.option_name IS NULL OR p.option_name = '') AND v.option_name IS NOT NULL AND v.option_name <> '')
        )
    `)
  }
}

export async function autoCreateManufacturersFromNames(params: {
  names: string[]
  tx: Transaction
}): Promise<{ createdNames: string[]; manufacturerIdByLowerName: Map<string, number> }> {
  const canonicalByLower = new Map<string, string>()

  for (const raw of params.names) {
    const name = raw.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!canonicalByLower.has(key)) {
      canonicalByLower.set(key, name)
    }
  }

  const uniqueNames = [...canonicalByLower.values()]
  const createdNames: string[] = []

  for (const group of chunk(uniqueNames, INSERT_CHUNK_SIZE)) {
    const inserted = await params.tx
      .insert(manufacturer)
      .values(group.map((name) => ({ name })))
      .onConflictDoNothing({ target: manufacturer.name })
      .returning({ name: manufacturer.name })
    createdNames.push(...inserted.map((r) => r.name))
  }

  const manufacturerIdByLowerName = new Map<string, number>()

  for (const group of chunk(uniqueNames, INSERT_CHUNK_SIZE)) {
    const rows = await params.tx
      .select({ id: manufacturer.id, name: manufacturer.name })
      .from(manufacturer)
      .where(
        inArray(
          manufacturer.name,
          group.map((n) => n),
        ),
      )

    for (const r of rows) {
      manufacturerIdByLowerName.set(r.name.toLowerCase(), r.id)
    }
  }

  return { createdNames, manufacturerIdByLowerName }
}

export async function autoCreateUnmappedOptionCandidates(params: {
  candidates: Array<{ optionName: string; productCode: string }>
  tx: Transaction
}): Promise<void> {
  const seen = new Set<string>()
  const values: Array<{ manufacturerId: null; optionName: string; productCode: string }> = []

  for (const c of params.candidates) {
    const productCode = c.productCode.trim()
    const optionName = c.optionName.trim()
    if (!productCode || !optionName) continue

    const key = `${productCode.toLowerCase()}_${optionName.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    values.push({ productCode, optionName, manufacturerId: null })
  }

  for (const group of chunk(values, INSERT_CHUNK_SIZE)) {
    await params.tx
      .insert(optionMapping)
      .values(group)
      .onConflictDoNothing({ target: [optionMapping.productCode, optionMapping.optionName] })
  }
}

function chunk<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items]
  const out: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(items.slice(i, i + chunkSize))
  }
  return out
}
