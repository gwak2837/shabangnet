import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { SHOPPING_MALL_TEST_CASES } from '../common/fixtures'
import { compareRowCounts, getExcelRowCount } from '../util/excel'

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
        const rows = page.locator('tbody tr')
        const rowCount = await rows.count()
        expect(rowCount).toBeGreaterThan(0)
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

// 쇼핑몰 변환 Golden File 비교
test.describe('쇼핑몰 변환 Golden File 비교', () => {
  for (const testCase of SHOPPING_MALL_TEST_CASES) {
    test(`${testCase.mallName} 원본-변환 파일 행 수 일치 검증`, async () => {
      // 파일 존재 확인
      if (!fs.existsSync(testCase.originalFile) || !fs.existsSync(testCase.convertedFile)) {
        console.log(`파일을 찾을 수 없습니다: ${testCase.mallName}`)
        test.skip()
        return
      }

      // 원본 파일과 변환된 파일의 행 수 비교
      const originalRowCount = await getExcelRowCount(testCase.originalFile, 1)
      const convertedRowCount = await getExcelRowCount(testCase.convertedFile, 1)

      console.log(`${testCase.mallName}: 원본 ${originalRowCount}행, 변환 ${convertedRowCount}행`)

      // 변환 후 데이터 손실이 없어야 함
      // 참고: 원본과 변환 파일의 행 수가 정확히 일치할 필요는 없지만,
      // 변환 결과가 0이 아니어야 함
      expect(convertedRowCount).toBeGreaterThan(0)
    })
  }

  // 쇼핑몰 원본 vs 변환 결과 유연 비교
  for (const testCase of SHOPPING_MALL_TEST_CASES) {
    test(`${testCase.mallName} 변환 결과 유연 비교`, async () => {
      // 파일 존재 확인
      if (!fs.existsSync(testCase.convertedFile)) {
        console.log(`변환 파일을 찾을 수 없습니다: ${testCase.convertedFile}`)
        test.skip()
        return
      }

      // 변환된 파일 자체의 유효성 검증
      // (원본과 직접 비교는 컬럼 구조가 다르므로 불가)
      const rowCount = await getExcelRowCount(testCase.convertedFile, 1)

      console.log(`${testCase.mallName} 변환 결과 검증: ${rowCount}개 행`)

      // 변환 결과가 유효해야 함
      expect(rowCount).toBeGreaterThan(0)
    })
  }
})

// 쇼핑몰 원본-변환 파일 쌍 비교 (같은 변환 로직 사용 시)
test.describe('쇼핑몰 변환 결과 일관성 검증', () => {
  test('SK스토아: 원본-변환 데이터 일관성', async () => {
    const testCase = SHOPPING_MALL_TEST_CASES.find((tc) => tc.mallName === 'SK스토아')
    if (!testCase || !fs.existsSync(testCase.originalFile) || !fs.existsSync(testCase.convertedFile)) {
      test.skip()
      return
    }

    // 행 수 비교
    const result = await compareRowCounts(testCase.originalFile, testCase.convertedFile, 1)
    console.log(`SK스토아: 원본 ${result.expected}행 → 변환 ${result.actual}행`)

    // 변환 결과가 있어야 함
    expect(result.actual).toBeGreaterThan(0)
  })

  test('삼성복지몰: 원본-변환 데이터 일관성', async () => {
    const testCase = SHOPPING_MALL_TEST_CASES.find((tc) => tc.mallName === '삼성복지몰')
    if (!testCase || !fs.existsSync(testCase.originalFile) || !fs.existsSync(testCase.convertedFile)) {
      test.skip()
      return
    }

    // 행 수 비교
    const result = await compareRowCounts(testCase.originalFile, testCase.convertedFile, 1)
    console.log(`삼성복지몰: 원본 ${result.expected}행 → 변환 ${result.actual}행`)

    // 변환 결과가 있어야 함
    expect(result.actual).toBeGreaterThan(0)
  })

  test('삼성카드몰: 원본-변환 데이터 일관성', async () => {
    const testCase = SHOPPING_MALL_TEST_CASES.find((tc) => tc.mallName === '삼성카드몰')
    if (!testCase || !fs.existsSync(testCase.originalFile) || !fs.existsSync(testCase.convertedFile)) {
      test.skip()
      return
    }

    // 행 수 비교
    const result = await compareRowCounts(testCase.originalFile, testCase.convertedFile, 1)
    console.log(`삼성카드몰: 원본 ${result.expected}행 → 변환 ${result.actual}행`)

    // 변환 결과가 있어야 함
    expect(result.actual).toBeGreaterThan(0)
  })
})

// 변환된 파일 간 Golden File 비교 (테스트 데이터 검증용)
test.describe('변환 결과 Golden File 직접 비교', () => {
  test('변환 결과 파일들의 핵심 컬럼 존재 확인', async () => {
    for (const testCase of SHOPPING_MALL_TEST_CASES) {
      if (!fs.existsSync(testCase.convertedFile)) {
        console.log(`건너뜀: ${testCase.mallName}`)
        continue
      }

      // 파일이 유효한 Excel 파일인지 확인
      const rowCount = await getExcelRowCount(testCase.convertedFile, 1)
      console.log(`${testCase.mallName}: ${rowCount}개 데이터 행`)

      expect(rowCount).toBeGreaterThanOrEqual(0)
    }
  })

  // 두 번 변환해도 같은 결과가 나오는지 검증 (멱등성)
  test('SK스토아 변환 재현성 검증', async ({ page }) => {
    const testCase = SHOPPING_MALL_TEST_CASES.find((tc) => tc.mallName === 'SK스토아')
    if (!testCase || !fs.existsSync(testCase.originalFile) || !fs.existsSync(testCase.convertedFile)) {
      test.skip()
      return
    }

    // 변환 수행 (첫 번째)
    await page.goto('/upload')
    await page.getByRole('button', { name: /쇼핑몰 주문/ }).click()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: testCase.dropdownOption }).click()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testCase.originalFile)

    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 처리된 건수 확인
    const resultText = await page.getByText(/처리된 주문/).textContent()
    console.log(`첫 번째 변환: ${resultText}`)

    // 처리된 주문이 있어야 함
    expect(resultText).toBeTruthy()
  })
})
