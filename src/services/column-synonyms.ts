'use server'

import { and, eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { columnSynonym } from '@/db/schema/settings'

// ============================================
// Types
// ============================================

export interface ColumnSynonym {
  enabled: boolean
  id: number
  standardKey: string
  synonym: string
}

export interface ColumnSynonymsMap {
  [standardKey: string]: string[]
}

// ============================================
// Query Functions
// ============================================

/**
 * 두 컬럼명 배열 간 자동 매핑 수행
 */
export async function autoMapColumns(
  sourceHeaders: string[],
  targetHeaders: string[],
): Promise<Record<string, string>> {
  const { map, reverseMap } = await loadSynonyms()
  const mappings: Record<string, string> = {}

  for (const sourceHeader of sourceHeaders) {
    const sourceKey = findStandardKey(sourceHeader, reverseMap)
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

/**
 * 컬럼명으로 사방넷 표준 키 찾기
 */
export async function findStandardKeyByLabel(label: string): Promise<string | null> {
  const { reverseMap } = await loadSynonyms()
  return findStandardKey(label, reverseMap)
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
 * 동의어 맵 조회
 */
export async function getSynonymsMap(): Promise<ColumnSynonymsMap> {
  const { map } = await loadSynonyms()
  return map
}

/**
 * 표준 키의 모든 동의어 삭제
 */
export async function removeSynonymsByKey(standardKey: string): Promise<void> {
  await db.delete(columnSynonym).where(eq(columnSynonym.standardKey, standardKey))
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

// ============================================
// Private Helpers
// ============================================

/**
 * 표준 키 찾기 (동기 함수)
 */
function findStandardKey(label: string, reverseMap: Map<string, string>): string | null {
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
 * 동의어 맵과 역방향 맵 로드
 */
async function loadSynonyms(): Promise<{ map: ColumnSynonymsMap; reverseMap: Map<string, string> }> {
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

  return { map, reverseMap }
}
