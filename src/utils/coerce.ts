/**
 * 숫자처럼 보이는 값(예: "1,234원", " -12.5 ")을 최대한 숫자로 파싱해요.
 * 파싱에 실패하면 0을 반환해요.
 */
export function parseLooseNumber(value: unknown): number {
  const raw = toTrimmedString(value)
  if (raw.length === 0) {
    return 0
  }

  const cleaned = raw.replace(/[^0-9.-]/g, '')
  const parsed = Number.parseFloat(cleaned)

  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * unknown 값을 안전하게 문자열/숫자로 변환하는 작은 코어 유틸이에요.
 * 업로드/엑셀 파싱 등 “입력 타입이 불확실한” 구간에서 재사용합니다.
 */
export function toTrimmedString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}
