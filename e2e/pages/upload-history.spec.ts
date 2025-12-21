import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { FLEXIBLE_COMPARE_OPTIONS_SHOPPING_MALL_BASE, getShoppingMallGoldenCases } from '../common/fixtures'
import { flexibleCompareExcelFiles, formatFlexibleCompareResult } from '../util/excel'

const DOWNLOADS_DIR = path.join(__dirname, '../test-results/downloads')
const UPDATE_GOLDEN = process.env.E2E_UPDATE_GOLDEN === 'true'

function pickHistoryCase() {
  const cases = getShoppingMallGoldenCases()
  const preferred = cases.find((c) => c.fileName.normalize('NFC').includes('sk스토아') && c.fileName.includes('20251126'))
  return preferred ?? cases[0]!
}

test.beforeAll(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
})

test.describe('업로드 기록', () => {
  test('쇼핑몰 업로드 기록에서 엑셀 다운로드가 동작해요', async ({ page }) => {
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

    await page.locator('input[type="file"]').setInputFiles(testCase.inputFile)

    const uploadResponse = await uploadResponsePromise
    expect(uploadResponse.ok()).toBe(true)
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 60_000 })

    // 2) 업로드 기록으로 이동 → 쇼핑몰 필터 적용
    const initialHistoryResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/upload/history') && res.request().method() === 'GET'
    })
    await page.goto('/upload/history')
    await initialHistoryResponsePromise
    await expect(page.getByText('업로드 기록이 없어요.')).not.toBeVisible().catch(() => {})

    const filteredHistoryResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/upload/history') && res.url().includes('file-type=shopping_mall')
    })
    await page.getByLabel('파일 유형').selectOption('shopping_mall')
    await filteredHistoryResponsePromise

    const row = page.getByRole('row').filter({ has: page.getByText(testCase.fileName, { exact: true }) }).first()
    await expect(row).toBeVisible({ timeout: 30_000 })

    // 3) 해당 row의 다운로드 버튼 클릭 → 다운로드 저장
    const actualPath = path.join(DOWNLOADS_DIR, `history_${testCase.fileName}`)
    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
    await row.getByRole('button', { name: '엑셀 다운로드' }).click()
    const download = await downloadPromise
    await download.saveAs(actualPath)

    expect(fs.statSync(actualPath).size).toBeGreaterThan(0)

    if (UPDATE_GOLDEN) {
      fs.copyFileSync(actualPath, testCase.expectedFile)
      return
    }

    const compareResult = await flexibleCompareExcelFiles(testCase.expectedFile, actualPath, {
      ...FLEXIBLE_COMPARE_OPTIONS_SHOPPING_MALL_BASE,
      headerRow: testCase.headerRow,
    })

    if (!compareResult.isMatch) {
      console.log(formatFlexibleCompareResult(compareResult))
    }

    expect(compareResult.isMatch, `업로드 기록 다운로드 Golden 불일치: ${testCase.fileName}\n${compareResult.summary}`).toBe(true)
  })
})


