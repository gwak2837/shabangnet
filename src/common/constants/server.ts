// ============================================
// 서버 전용 상수 (환경 변수 의존)
// ============================================

import { env } from '../env'

// ============================================
// 테스트 계정 설정 (로컬 개발용)
// ============================================

export const TEST_ACCOUNTS = [
  {
    email: env.TEST_USER_EMAIL,
    name: 'Test Admin',
    role: 'admin',
  },
  {
    email: 'staff@test.com',
    name: 'Test Staff',
    role: 'staff',
  },
  {
    email: 'user@test.com',
    name: 'Test User',
    role: 'user',
  },
]
