/**
 * 옵션명 정규화
 *
 * 요구사항:
 * - trim
 * - 연속된 공백은 1개로 취급
 * - 끝의 `[숫자]`(수량 중복 표기)는 제거
 */
export function normalizeOptionName(raw: string): string {
  const trimmed = raw.replaceAll('\u00a0', ' ').trim()
  if (!trimmed) return ''

  const collapsed = trimmed.replace(/\s+/g, ' ')
  const withoutQuantitySuffix = collapsed.replace(/\s*\[\d+\]\s*$/, '').trim()
  if (!withoutQuantitySuffix) return ''

  return withoutQuantitySuffix.replace(/\s+/g, ' ')
}
