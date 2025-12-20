/**
 * 옵션명 정규화
 *
 * 요구사항:
 * - trim
 * - 연속된 공백은 1개로 취급
 * - 끝의 `[숫자]`(수량 중복 표기)는 제거
 * - "." / "..." / ". ." 등 점(.)으로만 이뤄진 값은 제거
 * - "없음"은 제거
 */
export function normalizeOptionName(raw: string): string {
  const trimmed = raw.replaceAll('\u00a0', ' ').trim()
  if (!trimmed) return ''

  const collapsed = trimmed.replace(/\s+/g, ' ')
  const withoutQuantitySuffix = collapsed.replace(/\s*\[\d+\]\s*$/, '').trim()
  if (!withoutQuantitySuffix) return ''

  if (/^[.\s]+$/.test(withoutQuantitySuffix)) return ''
  if (withoutQuantitySuffix === '없음') return ''

  return withoutQuantitySuffix.replace(/\s+/g, ' ')
}
