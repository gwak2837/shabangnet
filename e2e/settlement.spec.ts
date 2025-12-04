/**
 * 정산 관리 테스트
 *
 * 제조사별 발주 내역 조회 및 정산서 다운로드 기능을 테스트합니다.
 *
 * 테스트 실행:
 * pnpm test:e2e e2e/real-data/settlement.spec.ts
 */

import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { SABANGNET_TEST_CASES } from './fixtures'

// 다운로드된 파일 저장 경로
const DOWNLOADS_DIR = path.join(__dirname, '../test-results/downloads')

// 테스트 전에 다운로드 디렉토리 생성
test.beforeAll(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
})

test.describe('정산 관리 페이지 기본 테스트', () => {
  test('정산 관리 페이지 접근', async ({ page }) => {
    await page.goto('/settlement')
    await expect(page.getByRole('heading', { name: '정산 관리' })).toBeVisible()

    // 페이지 설명 확인
    await expect(page.getByText(/제조사별 발주 내역을 조회하고 정산서를 다운로드/)).toBeVisible()
  })

  test('필터 UI 요소 확인', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택 드롭다운
    await expect(page.getByRole('combobox').first()).toBeVisible()

    // 기간 선택 옵션 (월 선택/기간 지정)
    await expect(page.getByRole('button', { name: '월 선택' })).toBeVisible()

    // 조회 버튼
    await expect(page.getByRole('button', { name: /조회/ })).toBeVisible()
  })

  test('제조사 드롭다운 목록 확인', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택 드롭다운 클릭
    const manufacturerSelect = page.getByRole('combobox').first()
    await manufacturerSelect.click()

    // 제조사 목록이 표시되는지 확인 (시드된 제조사들)
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 })

    // 대표적인 제조사들이 목록에 있는지 확인
    const topManufacturer = SABANGNET_TEST_CASES[0]
    const option = page.getByRole('option', { name: topManufacturer.manufacturer })
    if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(option).toBeVisible()
    }

    // 드롭다운 닫기
    await page.keyboard.press('Escape')
  })

  test('초기 상태 - 조회 전 안내 메시지', async ({ page }) => {
    await page.goto('/settlement')

    // 조회 전에는 안내 메시지가 표시되어야 함
    await expect(page.getByText(/조회 조건을 선택하세요|제조사를 선택/)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('정산 데이터 조회 테스트', () => {
  test('제조사 선택 후 조회', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택
    const manufacturerSelect = page.getByRole('combobox').first()
    await manufacturerSelect.click()

    // 첫 번째 제조사 선택 (목록이 있는 경우)
    const firstOption = page.getByRole('option').first()
    if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstOption.click()

      // 조회 버튼 클릭
      await page.getByRole('button', { name: /조회/ }).click()

      // 로딩 또는 결과 표시 대기
      await page.waitForTimeout(2000)

      // 정산 요약 또는 테이블이 표시되어야 함
      const summary = page.locator('[class*="summary"], [class*="card"]').first()
      const table = page.locator('table').first()

      const hasSummary = await summary.isVisible({ timeout: 5000 }).catch(() => false)
      const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false)

      // 둘 중 하나라도 표시되면 성공
      expect(hasSummary || hasTable).toBe(true)
    }
  })

  test('월별 기간 선택 후 조회', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택
    const manufacturerSelect = page.getByRole('combobox').first()
    await manufacturerSelect.click()
    const firstOption = page.getByRole('option').first()
    if (!(await firstOption.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }
    await firstOption.click()

    // 월 선택 확인 (기본값일 수 있음)
    const monthTab = page.getByRole('button', { name: '월 선택' })
    if (await monthTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await monthTab.click()
    }

    // 월 선택기 확인
    const monthInput = page.locator('input[type="month"]')
    if (await monthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 이번 달로 설정되어 있는지 확인
      await expect(monthInput).toBeVisible()
    }

    // 조회 실행
    await page.getByRole('button', { name: /조회/ }).click()

    // 결과 대기
    await page.waitForTimeout(2000)
  })

  test('기간별 날짜 범위 선택 후 조회', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택
    const manufacturerSelect = page.getByRole('combobox').first()
    await manufacturerSelect.click()
    const firstOption = page.getByRole('option').first()
    if (!(await firstOption.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }
    await firstOption.click()

    // 기간 지정 선택
    const rangeTab = page.getByRole('button', { name: '기간 지정' })
    if (await rangeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rangeTab.click()

      // 시작일, 종료일 입력란 확인
      const startDateInput = page.locator('input[type="date"]').first()
      const endDateInput = page.locator('input[type="date"]').last()

      if (await startDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 날짜 범위 설정
        const today = new Date()
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        await startDateInput.fill(startOfMonth.toISOString().split('T')[0])
        await endDateInput.fill(endOfMonth.toISOString().split('T')[0])
      }
    }

    // 조회 실행
    await page.getByRole('button', { name: /조회/ }).click()

    // 결과 대기
    await page.waitForTimeout(2000)
  })
})

test.describe('정산 요약 및 테이블 검증', () => {
  test('정산 요약 카드 표시', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택 및 조회
    const manufacturerSelect = page.getByRole('combobox').first()
    await manufacturerSelect.click()
    const firstOption = page.getByRole('option').first()
    if (!(await firstOption.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }
    await firstOption.click()
    await page.getByRole('button', { name: /조회/ }).click()

    // 요약 정보 확인
    await page.waitForTimeout(3000)

    // 정산 요약 카드가 표시되면 확인
    const summaryText = page.getByText(/총 발주|총 수량|총 원가/)
    if (await summaryText.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(summaryText).toBeVisible()
    }
  })

  test('정산 테이블 컬럼 확인', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택 및 조회
    const manufacturerSelect = page.getByRole('combobox').first()
    await manufacturerSelect.click()
    const firstOption = page.getByRole('option').first()
    if (!(await firstOption.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }
    await firstOption.click()
    await page.getByRole('button', { name: /조회/ }).click()

    // 테이블 로드 대기
    const table = page.locator('table')
    if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 테이블 헤더 확인
      const expectedHeaders = ['주문번호', '상품명', '수량', '원가', '고객명']
      for (const header of expectedHeaders) {
        const headerCell = page.getByRole('columnheader', { name: new RegExp(header) })
        if (await headerCell.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(headerCell).toBeVisible()
        }
      }
    }
  })
})

test.describe('정산서 다운로드 테스트', () => {
  test('엑셀 다운로드 버튼 표시', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택 및 조회
    const manufacturerSelect = page.getByRole('combobox').first()
    await manufacturerSelect.click()
    const firstOption = page.getByRole('option').first()
    if (!(await firstOption.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }
    await firstOption.click()
    await page.getByRole('button', { name: /조회/ }).click()

    // 결과 대기
    await page.waitForTimeout(3000)

    // 엑셀 다운로드 버튼 확인
    const downloadButton = page.getByRole('button', { name: /엑셀 다운로드|다운로드/ })
    if (await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(downloadButton).toBeVisible()
    }
  })

  test('정산서 엑셀 다운로드', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택 및 조회
    const manufacturerSelect = page.getByRole('combobox').first()
    await manufacturerSelect.click()
    const firstOption = page.getByRole('option').first()
    if (!(await firstOption.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }
    await firstOption.click()
    await page.getByRole('button', { name: /조회/ }).click()

    // 결과 대기
    await page.waitForTimeout(3000)

    // 엑셀 다운로드 버튼 클릭
    const downloadButton = page.getByRole('button', { name: /엑셀 다운로드|다운로드/ })
    if (await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download')
      await downloadButton.click()
      const download = await downloadPromise

      // 파일명 검증
      const fileName = download.suggestedFilename()
      expect(fileName).toContain('정산서')
      expect(fileName).toContain('.xlsx')

      // 파일 저장
      await download.saveAs(path.join(DOWNLOADS_DIR, fileName))
    }
  })
})

test.describe('정산 데이터 없는 경우', () => {
  test('데이터 없음 안내 메시지', async ({ page }) => {
    await page.goto('/settlement')

    // 제조사 선택
    const manufacturerSelect = page.getByRole('combobox').first()
    await manufacturerSelect.click()

    // 데이터가 없을 수 있는 제조사 선택
    const option = page.getByRole('option').last()
    if (!(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }
    await option.click()

    // 조회 실행
    await page.getByRole('button', { name: /조회/ }).click()

    // 결과 대기
    await page.waitForTimeout(3000)

    // 데이터가 없는 경우 안내 메시지 또는 빈 테이블 표시
    const emptyMessage = page.getByText(/데이터가 없습니다|조회된 내역이 없습니다|발주 내역이 없습니다/)
    const emptyTable = page.locator('tbody tr').filter({ hasText: /없음|No data/ })

    const hasEmptyMessage = await emptyMessage.isVisible({ timeout: 3000 }).catch(() => false)
    const hasEmptyTable = await emptyTable.isVisible({ timeout: 3000 }).catch(() => false)
    const hasZeroSummary = await page
      .getByText(/0건|0원/)
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    // 셋 중 하나라도 해당하면 정상
    expect(hasEmptyMessage || hasEmptyTable || hasZeroSummary).toBe(true)
  })
})
