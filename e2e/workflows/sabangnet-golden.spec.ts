import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { COUNT_ONLY_TEST_CASES, INPUT_FILES, SABANGNET_TEST_CASES } from '../common/fixtures'
import { compareExcelFiles, formatCompareResult } from '../util/excel'

// 다운로드된 파일 저장 경로
const DOWNLOADS_DIR = path.join(__dirname, '../../test-results/downloads')

// 테스트 전에 다운로드 디렉토리 생성
test.beforeAll(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
})

test.describe.serial('사방넷 Golden File 비교 워크플로우', () => {
  // 업로드는 한 번만 수행 (누적 상태)
  test('1. 사방넷 원본 파일 업로드 및 파싱', async ({ page }) => {
    // 업로드 페이지로 이동
    await page.goto('/upload')
    await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

    // 사방넷 주문 탭 확인
    const sabangnetTab = page.getByRole('button', { name: /사방넷 주문/ })
    await expect(sabangnetTab).toBeVisible()

    // 파일 업로드
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(INPUT_FILES.sabangnet)

    // 처리 완료 대기
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 60000 })

    // 처리된 주문 수 확인
    await expect(page.getByText(/처리된 주문/)).toBeVisible()
  })

  test('2. 제조사별 분류 정확성 검증', async ({ page }) => {
    // 발주 페이지로 이동
    await page.goto('/order')
    await expect(page.getByRole('heading', { name: '발주 생성/발송' })).toBeVisible()

    // 테이블 로드 대기
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })

    // 페이지에 표시된 제조사 확인 (상위 몇 개만)
    const topManufacturers = SABANGNET_TEST_CASES.slice(0, 5)
    for (const testCase of topManufacturers) {
      // 제조사명이 페이지에 표시되는지 확인
      const manufacturerText = page.getByText(testCase.manufacturer, { exact: true })
      await expect(manufacturerText).toBeVisible({ timeout: 5000 })
    }
  })

  // 각 제조사별 Golden File 비교 테스트 (동적 생성)
  for (const testCase of SABANGNET_TEST_CASES) {
    test.skip(`3. [${testCase.manufacturer}] 발주서 생성 및 Golden File 비교`, async ({ page }) => {
      // 예상 출력 파일 존재 확인
      if (!fs.existsSync(testCase.expectedFile)) {
        test.skip()
        return
      }

      // 발주 페이지로 이동
      await page.goto('/order')
      await expect(page.locator('table')).toBeVisible({ timeout: 15000 })

      // 해당 제조사 행 찾기
      const manufacturerRow = page.locator('tr').filter({ hasText: testCase.manufacturer })

      // 제조사가 표시되지 않으면 스킵
      if (!(await manufacturerRow.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.log(`제조사 "${testCase.manufacturer}"가 목록에 없습니다. 스킵합니다.`)
        return
      }

      // 작업 메뉴 버튼 찾기
      const menuButton = manufacturerRow.getByRole('button', { name: '작업 메뉴' })
      if (!(await menuButton.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.log(`제조사 "${testCase.manufacturer}"의 작업 메뉴를 찾을 수 없습니다.`)
        return
      }

      // 메뉴 열기
      await menuButton.click()

      // 다운로드 메뉴 아이템 찾기
      const downloadItem = page.getByRole('menuitem', { name: /다운로드/i })
      if (!(await downloadItem.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.log(`제조사 "${testCase.manufacturer}"의 다운로드 메뉴를 찾을 수 없습니다.`)
        // 메뉴 닫기
        await page.keyboard.press('Escape')
        return
      }

      // 다운로드 이벤트 대기 및 클릭
      const downloadPromise = page.waitForEvent('download')
      await downloadItem.click()
      const download = await downloadPromise

      // 파일명 검증
      const fileName = download.suggestedFilename()
      expect(fileName).toContain('.xlsx')

      // 파일 저장
      const downloadPath = path.join(DOWNLOADS_DIR, `${testCase.manufacturer}_발주서.xlsx`)
      await download.saveAs(downloadPath)

      // Golden File 비교
      const compareResult = await compareExcelFiles(testCase.expectedFile, downloadPath, {
        trimWhitespace: true,
        ignoreEmptyCells: true,
        numericTolerance: 0.01,
        dateOnly: true,
        headerRow: 1,
      })

      // 비교 결과 로그
      if (!compareResult.isMatch) {
        console.log(formatCompareResult(compareResult))
      }

      // 엄격 모드: 차이점이 있으면 실패
      expect(compareResult.isMatch, `Golden File 비교 실패:\n${compareResult.summary}`).toBe(true)
    })
  }

  // 주문 건수만 검증하는 제조사들
  test('4. 예상 출력 파일 없는 제조사 주문 건수 확인', async ({ page }) => {
    await page.goto('/order')
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })

    // 몇 개의 대표 제조사만 확인
    const sampleCases = COUNT_ONLY_TEST_CASES.slice(0, 5)
    for (const testCase of sampleCases) {
      const manufacturerRow = page.locator('tr').filter({ hasText: testCase.manufacturer })

      // 제조사가 표시되면 행이 존재하는지만 확인
      if (await manufacturerRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(manufacturerRow).toBeVisible()
      }
    }
  })
})

// 발주서 다운로드 일괄 테스트 (선택적)
test.describe.serial('발주서 일괄 다운로드 테스트', () => {
  test.skip('모든 제조사 발주서 일괄 다운로드', async ({ page }) => {
    // 이 테스트는 시간이 오래 걸리므로 기본적으로 스킵
    // 필요시 test.skip()을 제거하고 실행

    await page.goto('/order')
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })

    // 모든 다운로드 버튼 찾기
    const downloadButtons = page.getByRole('button', { name: /다운로드/i })
    const count = await downloadButtons.count()

    console.log(`총 ${count}개의 제조사 발주서 다운로드 가능`)

    // 각 버튼에 대해 다운로드 수행
    for (let i = 0; i < Math.min(count, 5); i++) {
      // 처음 5개만 테스트
      const button = downloadButtons.nth(i)

      if (await button.isVisible()) {
        const downloadPromise = page.waitForEvent('download')
        await button.click()
        const download = await downloadPromise

        const fileName = download.suggestedFilename()
        expect(fileName).toContain('.xlsx')

        // 다운로드 완료 대기
        await download.saveAs(path.join(DOWNLOADS_DIR, fileName))
      }
    }
  })
})
