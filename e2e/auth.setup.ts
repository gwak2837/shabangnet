/**
 * 인증 Setup
 *
 * 테스트 실행 전 한 번 로그인하여 세션을 저장합니다.
 * 다른 테스트들은 이 저장된 세션을 재사용합니다.
 */

import { expect, test as setup } from '@playwright/test'

import { TEST_USER } from './common/fixtures'

const authFile = 'e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // 로그인 페이지로 이동
  await page.goto('/login')
  await page.locator('#email').waitFor({ state: 'visible' })

  // 이메일 입력
  await page.locator('#email').fill(TEST_USER.email)

  // 비밀번호 입력
  await page.locator('#password').fill(TEST_USER.password)

  // 로그인 버튼 클릭
  await page.getByRole('button', { name: '로그인', exact: true }).click()

  // 로그인 성공 확인 (대시보드로 리다이렉트)
  await expect(page).toHaveURL(/\/(dashboard|upload|orders|manufacturers)/, { timeout: 15000 })

  // 세션 상태 저장
  await page.context().storageState({ path: authFile })
})
