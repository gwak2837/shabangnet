import { test as base, expect } from '@playwright/test'
import path from 'path'

// 테스트 데이터 경로
export const TEST_DATA_DIR = path.join(__dirname, '../public/data/real-data')

// 테스트에서 사용할 파일들
export const TEST_FILES = {
  sabangnet: path.join(TEST_DATA_DIR, '사방넷 원본파일 수정본.xlsx'),
  skOriginal: path.join(TEST_DATA_DIR, 'sk원본1203.xlsx'),
  samsungWelfare: path.join(TEST_DATA_DIR, '삼성복지원본 1203.xlsx'),
  samsungCard: path.join(TEST_DATA_DIR, '삼성카드 원본 1203.xlsx'),
  // 예상 결과 파일
  expectedGochang: path.join(TEST_DATA_DIR, '다온발주양식_고창베리.xlsx'),
  expectedRodem: path.join(TEST_DATA_DIR, '다온발주양식_로뎀푸드.xlsx'),
}

// 테스트용 제조사
export const TEST_MANUFACTURERS = {
  gochang: {
    name: '고창베리세상',
    expectedOrderCount: 12,
  },
  rodem: {
    name: '로뎀푸드',
    expectedOrderCount: 18,
  },
  hanul: {
    name: '하늘명인',
    expectedOrderCount: 24,
  },
}

// 테스트 계정 정보
export const TEST_USER = {
  email: 'test@e2e.local',
  password: 'Test1234!',
}

// 로그인 헬퍼 함수
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')

  // 이메일 입력 (id로 선택)
  await page.locator('#email').fill(TEST_USER.email)

  // 비밀번호 입력 (id로 선택 - 비밀번호 보기 버튼과 구분)
  await page.locator('#password').fill(TEST_USER.password)

  // 로그인 버튼 클릭
  await page.getByRole('button', { name: '로그인', exact: true }).click()

  // 대시보드로 리다이렉트 대기
  await expect(page).toHaveURL(/\/(dashboard|upload|orders|manufacturers)/, { timeout: 15000 })
}

// 커스텀 테스트 픽스처 - 자동 로그인
export const test = base.extend<{
  authenticatedPage: import('@playwright/test').Page
}>({
  authenticatedPage: async ({ page }, runFixture) => {
    await login(page)
    await runFixture(page)
  },
})

export { expect }
