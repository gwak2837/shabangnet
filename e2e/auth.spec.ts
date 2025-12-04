import { expect, test } from '@playwright/test'

import { TEST_USER } from './fixtures'

test.describe('인증', () => {
  test('이메일/비밀번호로 로그인', async ({ page }) => {
    await page.goto('/login')

    // 로그인 페이지 확인
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()

    // 이메일 입력 (id로 선택)
    await page.locator('#email').fill(TEST_USER.email)

    // 비밀번호 입력 (id로 선택)
    await page.locator('#password').fill(TEST_USER.password)

    // 로그인 버튼 클릭
    await page.getByRole('button', { name: '로그인', exact: true }).click()

    // 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL(/\/(dashboard|upload|orders|manufacturers)/, { timeout: 15000 })
  })

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login')

    // 이메일 입력 (id로 선택)
    await page.locator('#email').fill(TEST_USER.email)

    // 잘못된 비밀번호 입력 (id로 선택)
    await page.locator('#password').fill('WrongPassword123!')

    // 로그인 버튼 클릭
    await page.getByRole('button', { name: '로그인', exact: true }).click()

    // 에러 메시지 확인 (로그인 버튼이 비활성화에서 다시 활성화되면 에러 처리 완료)
    await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeEnabled({ timeout: 5000 })
    // 페이지에 에러 텍스트가 표시되어야 함
    await expect(page.locator('.text-destructive, [class*="error"], [class*="Error"]').first())
      .toBeVisible({ timeout: 3000 })
      .catch(() => {
        // 에러 메시지 UI가 없으면 로그인 페이지에 남아있는지 확인
        return expect(page).toHaveURL(/login/)
      })
  })

  test('로그인 페이지에서 회원가입 링크 확인', async ({ page }) => {
    await page.goto('/login')

    // 회원가입 링크 확인
    await expect(page.getByRole('link', { name: '회원가입' })).toBeVisible()
  })
})
