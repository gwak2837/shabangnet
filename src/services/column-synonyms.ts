'use server'

import { and, eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { columnSynonym } from '@/db/schema/settings'

// ============================================
// Types
// ============================================

export interface ColumnSynonym {
  enabled: boolean
  id: string
  standardKey: string
  synonym: string
}

export interface ColumnSynonymsMap {
  [standardKey: string]: string[]
}

// ============================================
// Cache
// ============================================

interface SynonymCache {
  data: ColumnSynonymsMap | null
  lastUpdated: number
  reverseMap: Map<string, string> | null
}

// 메모리 캐시 (서버 인스턴스별)
let cache: SynonymCache = {
  data: null,
  reverseMap: null,
  lastUpdated: 0,
}

// 캐시 유효 시간 (5분)
const CACHE_TTL = 5 * 60 * 1000

// ============================================
// Cache Management
// ============================================

/**
 * 동의어 추가
 */
export async function addSynonym(data: { standardKey: string; synonym: string }): Promise<ColumnSynonym> {
  const [newSynonym] = await db
    .insert(columnSynonym)
    .values({
      id: `syn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      standardKey: data.standardKey,
      synonym: data.synonym,
      enabled: true,
    })
    .returning()

  // 캐시 무효화
  await invalidateSynonymCache()

  return {
    id: newSynonym.id,
    standardKey: newSynonym.standardKey,
    synonym: newSynonym.synonym,
    enabled: newSynonym.enabled ?? true,
  }
}

/**
 * 두 컬럼명 배열 간 자동 매핑 수행 (캐시 사용)
 */
export async function autoMapColumns(
  sourceHeaders: string[],
  targetHeaders: string[],
): Promise<Record<string, string>> {
  const { map } = await getCachedSynonyms()
  const mappings: Record<string, string> = {}

  for (const sourceHeader of sourceHeaders) {
    const sourceKey = await findStandardKeyByLabel(sourceHeader)
    if (!sourceKey) continue

    // 타겟에서 같은 키에 해당하는 컬럼 찾기
    const synonyms = map[sourceKey] || []
    const targetHeader = targetHeaders.find((th) => {
      const normalized = th.trim().toLowerCase()
      return synonyms.some((s) => s.toLowerCase() === normalized || normalized.includes(s.toLowerCase()))
    })

    if (targetHeader) {
      mappings[sourceHeader] = targetHeader
    }
  }

  return mappings
}

// ============================================
// CRUD Operations
// ============================================

/**
 * 컬럼명으로 사방넷 표준 키 찾기 (캐시 사용)
 */
export async function findStandardKeyByLabel(label: string): Promise<string | null> {
  const { reverseMap } = await getCachedSynonyms()
  const normalized = label.trim().toLowerCase()

  // 직접 매칭 시도
  const directMatch = reverseMap.get(normalized)
  if (directMatch) return directMatch

  // 부분 매칭 시도 (포함 관계)
  for (const [synonym, key] of reverseMap.entries()) {
    if (normalized.includes(synonym) || synonym.includes(normalized)) {
      return key
    }
  }

  return null
}

/**
 * 모든 동의어 조회
 */
export async function getAllSynonyms(): Promise<ColumnSynonym[]> {
  const result = await db.select().from(columnSynonym).orderBy(columnSynonym.standardKey, columnSynonym.synonym)

  return result.map((s) => ({
    id: s.id,
    standardKey: s.standardKey,
    synonym: s.synonym,
    enabled: s.enabled ?? true,
  }))
}

/**
 * 표준 키별 동의어 조회
 */
export async function getSynonymsByKey(standardKey: string): Promise<ColumnSynonym[]> {
  const result = await db
    .select()
    .from(columnSynonym)
    .where(eq(columnSynonym.standardKey, standardKey))
    .orderBy(columnSynonym.synonym)

  return result.map((s) => ({
    id: s.id,
    standardKey: s.standardKey,
    synonym: s.synonym,
    enabled: s.enabled ?? true,
  }))
}

/**
 * 동의어 맵 조회 (캐시 사용)
 */
export async function getSynonymsMap(): Promise<ColumnSynonymsMap> {
  const { map } = await getCachedSynonyms()
  return map
}

/**
 * 캐시 무효화
 */
export async function invalidateSynonymCache(): Promise<void> {
  cache = {
    data: null,
    reverseMap: null,
    lastUpdated: 0,
  }
}

/**
 * 동의어 삭제
 */
export async function removeSynonym(id: string): Promise<void> {
  await db.delete(columnSynonym).where(eq(columnSynonym.id, id))

  // 캐시 무효화
  await invalidateSynonymCache()
}

// ============================================
// Lookup Functions
// ============================================

/**
 * 표준 키의 모든 동의어 삭제
 */
export async function removeSynonymsByKey(standardKey: string): Promise<void> {
  await db.delete(columnSynonym).where(eq(columnSynonym.standardKey, standardKey))

  // 캐시 무효화
  await invalidateSynonymCache()
}

/**
 * 동의어 존재 여부 확인
 */
export async function synonymExists(standardKey: string, synonym: string): Promise<boolean> {
  const result = await db
    .select()
    .from(columnSynonym)
    .where(and(eq(columnSynonym.standardKey, standardKey), eq(columnSynonym.synonym, synonym)))
    .limit(1)

  return result.length > 0
}

/**
 * 동의어 업데이트
 */
export async function updateSynonym(
  id: string,
  data: Partial<{ enabled: boolean; standardKey: string; synonym: string }>,
): Promise<ColumnSynonym> {
  const [updated] = await db
    .update(columnSynonym)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(columnSynonym.id, id))
    .returning()

  if (!updated) throw new Error('Synonym not found')

  // 캐시 무효화
  await invalidateSynonymCache()

  return {
    id: updated.id,
    standardKey: updated.standardKey,
    synonym: updated.synonym,
    enabled: updated.enabled ?? true,
  }
}

/**
 * 캐시된 동의어 맵 조회
 */
async function getCachedSynonyms(): Promise<{ map: ColumnSynonymsMap; reverseMap: Map<string, string> }> {
  const now = Date.now()

  // 캐시가 유효한 경우
  if (cache.data && cache.reverseMap && now - cache.lastUpdated < CACHE_TTL) {
    return { map: cache.data, reverseMap: cache.reverseMap }
  }

  // DB에서 새로 로드
  const synonyms = await db.select().from(columnSynonym).where(eq(columnSynonym.enabled, true))

  const map: ColumnSynonymsMap = {}
  const reverseMap = new Map<string, string>()

  for (const syn of synonyms) {
    if (!map[syn.standardKey]) {
      map[syn.standardKey] = []
    }
    map[syn.standardKey].push(syn.synonym)
    reverseMap.set(syn.synonym.toLowerCase(), syn.standardKey)
  }

  // 캐시 업데이트
  cache = {
    data: map,
    reverseMap,
    lastUpdated: now,
  }

  return { map, reverseMap }
}

