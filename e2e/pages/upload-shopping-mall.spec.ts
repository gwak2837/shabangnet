import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { FLEXIBLE_COMPARE_OPTIONS_SHOPPING_MALL_BASE, getShoppingMallGoldenCases } from '../common/fixtures'
import { flexibleCompareExcelFiles, formatFlexibleCompareResult } from '../util/excel'

const DOWNLOADS_DIR = path.join(__dirname, '../test-results/downloads')
const UPDATE_GOLDEN = process.env.E2E_UPDATE_GOLDEN === 'true'

test.beforeAll(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
})

test.describe('주문 업로드 / 쇼핑몰', () => {
  const cases = getShoppingMallGoldenCases()

  for (const testCase of cases) {
    test(`[${testCase.dropdownOption}] ${testCase.fileName} 변환 결과`, async ({ page }) => {
      test.setTimeout(60_000)

      await page.goto('/upload/shopping-mall')
      await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

      // 쇼핑몰 선택
      await page.getByRole('combobox').click()
      await page.getByRole('option', { name: testCase.dropdownOption }).click()

      // 업로드
      const uploadResponsePromise = page.waitForResponse((res) => {
        return res.url().includes('/api/upload/shopping-mall') && res.request().method() === 'POST'
      })

      const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
      await page.locator('input[type="file"]').setInputFiles(testCase.inputFile)

      const uploadResponse = await uploadResponsePromise
      expect(uploadResponse.ok()).toBe(true)

      // 업로드 후 즉시 다운로드가 시작돼요 (download 이벤트)
      const actualPath = path.join(DOWNLOADS_DIR, testCase.fileName)
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

      expect(compareResult.isMatch, `쇼핑몰 Golden 불일치: ${testCase.fileName}\n${compareResult.summary}`).toBe(true)
    })
  }
})
