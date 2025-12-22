/**
 * 제조사명 정규화
 *
 * - trim + 연속 공백 정리
 * - placeholder(미지정/미등록/없음/N/A/--- 등)는 null로 처리
 *
 * NOTE: "미지정"이 실제 제조사명처럼 내려가면 혼동될 수 있어서, placeholder는 항상 null로 만듭니다.
 */
export function normalizeManufacturerName(raw: string): string | null {
  const name = raw.replaceAll('\u00a0', ' ').trim().replace(/\s+/g, ' ')
  if (!name) {
    return null
  }

  // --- 같은 placeholder
  if (/^[-–—]+$/.test(name)) {
    return null
  }

  const lower = name.toLowerCase()
  if (lower === '미지정' || lower === '미등록' || lower === '없음' || lower === 'n/a' || lower === 'na') {
    return null
  }

  return name
}
