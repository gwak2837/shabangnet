import { SITE_CONFIG } from './constants'

/**
 * 현재 환경에 맞는 앱 origin URL을 반환합니다.
 *
 * - 프로덕션: SITE_CONFIG.url (https://shabangnet.vercel.app)
 * - Vercel 프리뷰: https://{VERCEL_URL}
 * - 개발: http://localhost:3000
 */
export function getOrigin(): string {
  // 프로덕션 환경
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    return SITE_CONFIG.url
  }

  // Vercel 프리뷰 환경
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }

  // 개발 환경
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}
