import { expect, test } from '@playwright/test'

import { INPUT_FILES } from '../common/fixtures'

test.describe('주문 업로드 / 사방넷', () => {
  test('사방넷 파일을 업로드하면 결과가 보여요', async ({ page }) => {
    test.setTimeout(60_000)

    await page.goto('/upload/sabangnet')
    await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

    const uploadResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/upload/sabangnet') && res.request().method() === 'POST'
    })

    await page.locator('input[type="file"]').setInputFiles(INPUT_FILES.sabangnet)

    const uploadResponse = await uploadResponsePromise
    expect(uploadResponse.ok()).toBe(true)

    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('제조사별 분류 결과')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })
})
