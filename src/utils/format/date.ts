/**
 * 상대적 시간을 사용자 친화적인 한국어로 표시
 *
 * @example
 * formatRelativeTime(new Date()) // "방금 전"
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 5)) // "5분 전"
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 60 * 3)) // "3시간 전"
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)) // "2일 전"
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)) // "2주 전"
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 60 * 24 * 45)) // "1달 전"
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 60 * 24 * 400)) // "1년 전"
 */
export function formatRelativeTime(date: string | Date): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - targetDate.getTime()

  // 미래 시간인 경우
  if (diffMs < 0) {
    return formatFutureTime(-diffMs)
  }

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  // 1분 미만
  if (diffMinutes < 1) {
    return '방금 전'
  }

  // 1시간 미만
  if (diffHours < 1) {
    return `${diffMinutes}분 전`
  }

  // 24시간 미만
  if (diffDays < 1) {
    return `${diffHours}시간 전`
  }

  // 7일 미만
  if (diffWeeks < 1) {
    return diffDays === 1 ? '어제' : `${diffDays}일 전`
  }

  // 4주 미만
  if (diffMonths < 1) {
    return diffWeeks === 1 ? '1주 전' : `${diffWeeks}주 전`
  }

  // 12개월 미만
  if (diffYears < 1) {
    return diffMonths === 1 ? '1달 전' : `${diffMonths}달 전`
  }

  // 1년 이상
  return diffYears === 1 ? '1년 전' : `${diffYears}년 전`
}

function formatFutureTime(diffMs: number): string {
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffMinutes < 1) return '곧'
  if (diffHours < 1) return `${diffMinutes}분 후`
  if (diffDays < 1) return `${diffHours}시간 후`
  if (diffWeeks < 1) return diffDays === 1 ? '내일' : `${diffDays}일 후`
  if (diffMonths < 1) return diffWeeks === 1 ? '1주 후' : `${diffWeeks}주 후`
  if (diffYears < 1) return diffMonths === 1 ? '1달 후' : `${diffMonths}달 후`
  return diffYears === 1 ? '1년 후' : `${diffYears}년 후`
}
