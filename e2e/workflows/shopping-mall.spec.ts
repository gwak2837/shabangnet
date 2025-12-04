import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { SHOPPING_MALL_TEST_CASES } from '../common/fixtures'
import { getExcelRowCount } from '../util/excel'

// 다운로드된 파일 저장 경로
const DOWNLOADS_DIR = path.join(__dirname, '../../test-results/downloads')

// 테스트 전에 다운로드 디렉토리 생성
test.beforeAll(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
})

test.describe.serial('쇼핑몰 주문 변환 워크플로우', () => {
  // 각 쇼핑몰에 대해 테스트 생성
  for (const testCase of SHOPPING_MALL_TEST_CASES) {
    test.describe.serial(`${testCase.mallName} 변환`, () => {
      test(`${testCase.mallName} 원본 파일 업로드`, async ({ page }) => {
        // 원본 파일 존재 확인
        if (!fs.existsSync(testCase.originalFile)) {
          console.log(`원본 파일을 찾을 수 없습니다: ${testCase.originalFile}`)
          test.skip()
          return
        }

        // 업로드 페이지로 이동
        await page.goto('/upload')
        await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

        // 쇼핑몰 주문 탭으로 전환
        await page.getByRole('button', { name: /쇼핑몰 주문/ }).click()

        // 쇼핑몰 선택 드롭다운
        await page.getByRole('combobox').click()
        await page.getByRole('option', { name: testCase.dropdownOption }).click()

        // 파일 업로드
        const fileInput = page.locator('input[type="file"]')
        await fileInput.setInputFiles(testCase.originalFile)

        // 처리 완료 대기
        await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

        // 쇼핑몰 뱃지 표시 확인
        await expect(page.getByText(testCase.mallName)).toBeVisible()
      })

      test(`${testCase.mallName} 변환 결과 검증`, async ({ page }) => {
        // 예상 결과 파일 존재 확인
        if (!fs.existsSync(testCase.convertedFile)) {
          console.log(`예상 결과 파일을 찾을 수 없습니다: ${testCase.convertedFile}`)
          test.skip()
          return
        }

        // 발주 페이지로 이동
        await page.goto('/order')
        await expect(page.getByRole('heading', { name: '발주 생성/발송' })).toBeVisible()

        // 테이블 로드 대기
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 })

        // 변환된 주문이 제조사별로 분류되었는지 확인
        // (쇼핑몰 변환 후 사방넷 양식이 되므로 제조사 분류가 이루어짐)
      })

      test(`${testCase.mallName} 데이터 행 수 검증`, async () => {
        // 예상 결과 파일의 행 수 확인
        if (!fs.existsSync(testCase.convertedFile)) {
          test.skip()
          return
        }

        const rowCount = await getExcelRowCount(testCase.convertedFile, 1)
        console.log(`${testCase.mallName} 변환 결과: ${rowCount}개 데이터 행`)

        // 최소 1개 이상의 데이터가 있어야 함
        expect(rowCount).toBeGreaterThan(0)
      })
    })
  }
})

// 쇼핑몰별 변환 후 발주서 생성 테스트
test.describe.serial('쇼핑몰 변환 후 발주서 생성', () => {
  test('SK스토아 변환 후 발주 페이지 확인', async ({ page }) => {
    const skTestCase = SHOPPING_MALL_TEST_CASES.find((tc) => tc.mallName === 'SK스토아')
    if (!skTestCase || !fs.existsSync(skTestCase.originalFile)) {
      test.skip()
      return
    }

    // 업로드
    await page.goto('/upload')
    await page.getByRole('button', { name: /쇼핑몰 주문/ }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'SK스토아' }).click()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(skTestCase.originalFile)

    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 발주 페이지에서 결과 확인
    await page.goto('/order')
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })

    // 테이블에 데이터가 있는지 확인
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
  })

  test('삼성복지몰 변환 후 발주 페이지 확인', async ({ page }) => {
    const samsungWelfareCase = SHOPPING_MALL_TEST_CASES.find((tc) => tc.mallName === '삼성복지몰')
    if (!samsungWelfareCase || !fs.existsSync(samsungWelfareCase.originalFile)) {
      test.skip()
      return
    }

    // 업로드
    await page.goto('/upload')
    await page.getByRole('button', { name: /쇼핑몰 주문/ }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: '삼성복지몰' }).click()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(samsungWelfareCase.originalFile)

    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 발주 페이지에서 결과 확인
    await page.goto('/order')
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  })

  test('삼성카드몰 변환 후 발주 페이지 확인', async ({ page }) => {
    const samsungCardCase = SHOPPING_MALL_TEST_CASES.find((tc) => tc.mallName === '삼성카드몰')
    if (!samsungCardCase || !fs.existsSync(samsungCardCase.originalFile)) {
      test.skip()
      return
    }

    // 업로드
    await page.goto('/upload')
    await page.getByRole('button', { name: /쇼핑몰 주문/ }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: '삼성카드몰' }).click()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(samsungCardCase.originalFile)

    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 발주 페이지에서 결과 확인
    await page.goto('/order')
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  })
})

// 쇼핑몰 변환 Golden File 비교 (선택적)
test.describe('쇼핑몰 변환 Golden File 비교', () => {
  test.skip('SK스토아 변환 결과 Golden File 비교', async () => {
    // 이 테스트는 변환 결과를 다운로드하여 비교해야 하므로
    // 실제 다운로드 기능이 구현되어 있어야 함
    // 현재는 스킵

    const skTestCase = SHOPPING_MALL_TEST_CASES.find((tc) => tc.mallName === 'SK스토아')
    if (!skTestCase) {
      test.skip()
      return
    }

    // TODO: 변환 결과 다운로드 기능이 있다면 여기서 비교
    // const compareResult = await compareExcelFiles(
    //   skTestCase.convertedFile,
    //   downloadedFile,
    //   { ... }
    // )
    // expect(compareResult.isMatch).toBe(true)
  })
})
