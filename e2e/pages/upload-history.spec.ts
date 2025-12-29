import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { getShoppingMallGoldenCases } from '../common/fixtures'

const DOWNLOADS_DIR = path.join(__dirname, '../test-results/downloads')
function pickHistoryCase() {
  const cases = getShoppingMallGoldenCases()
  const preferred = cases.find(
    (c) => c.fileName.normalize('NFC').includes('sk스토아') && c.fileName.includes('20251126'),
  )
  return preferred ?? cases[0]!
}

test.beforeAll(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
})

test.describe('업로드 기록', () => {
  test('쇼핑몰 업로드 기록이 남아요 (재다운로드는 없어요)', async ({ page }) => {
    test.setTimeout(90_000)

    const testCase = pickHistoryCase()

    // 1) 쇼핑몰 업로드 (유저 플로우 그대로)
    await page.goto('/upload/shopping-mall')
    await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: testCase.dropdownOption }).click()

    const uploadResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/upload/shopping-mall') && res.request().method() === 'POST'
    })

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
    await page.locator('input[type="file"]').setInputFiles(testCase.inputFile)

    const uploadResponse = await uploadResponsePromise
    expect(uploadResponse.ok()).toBe(true)

    // 업로드 후 즉시 다운로드가 시작돼요.
    const download = await downloadPromise
    await download.saveAs(path.join(DOWNLOADS_DIR, `history_setup_${testCase.fileName}`))

    // 2) 업로드 기록으로 이동 → 쇼핑몰 필터 적용
    const initialHistoryResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/upload/history') && res.request().method() === 'GET'
    })
    await page.goto('/upload/history')
    await initialHistoryResponsePromise
    await expect(page.getByText('업로드 기록이 없어요.'))
      .not.toBeVisible()
      .catch(() => {})

    const filteredHistoryResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/upload/history') && res.url().includes('file-type=shopping_mall')
    })
    await page.getByLabel('파일 유형').selectOption('shopping_mall')
    await filteredHistoryResponsePromise

    const row = page
      .getByRole('row')
      .filter({ has: page.getByText(testCase.fileName, { exact: true }) })
      .first()
    await expect(row).toBeVisible({ timeout: 30_000 })

    // 쇼핑몰 업로드는 재다운로드 기능이 없어요.
    await expect(page.getByRole('columnheader', { name: '다운로드' })).toHaveCount(0)
    await expect(row.getByRole('button', { name: '엑셀 다운로드' })).toHaveCount(0)
  })
})
