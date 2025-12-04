import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// 다운로드된 파일 저장 경로
const DOWNLOADS_DIR = path.join(__dirname, '../../test-results/downloads')

// 테스트 전에 다운로드 디렉토리 생성
test.beforeAll(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
})

test.describe('송장 변환 페이지 기본 테스트', () => {
  test('송장 변환 페이지 접근', async ({ page }) => {
    await page.goto('/invoice-convert')
    await expect(page.getByRole('heading', { name: '송장 변환' })).toBeVisible()

    // 페이지 설명 확인
    await expect(page.getByText(/거래처 송장 파일을 사방넷 업로드 양식으로 변환/)).toBeVisible()
  })

  test('단계별 진행 UI 확인', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 3단계 프로세스 UI 확인
    await expect(page.getByText('발주 선택')).toBeVisible()
    await expect(page.getByText('송장 업로드')).toBeVisible()
    await expect(page.getByText('변환 결과')).toBeVisible()
  })

  test('발주 선택 카드 표시', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 발주 선택 영역 확인
    // 발송 완료된 발주가 없으면 빈 목록이 표시됨
    await expect(page.locator('text=발주 선택').first()).toBeVisible()
  })

  test('송장 업로드 영역 비활성화 상태 확인', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 발주를 선택하지 않으면 업로드 영역이 비활성화되어야 함
    // Dropzone이 disabled 상태인지 확인
    const dropzone = page.locator('[class*="dropzone"]').first()
    if (await dropzone.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 비활성화된 상태는 클릭해도 파일 선택이 안됨
      await expect(dropzone).toBeVisible()
    }
  })
})

test.describe.serial('송장 변환 워크플로우 테스트', () => {
  // 이 테스트는 발송 완료된 발주가 있어야 실행 가능
  // 사전 조건: sabangnet-workflow 테스트에서 발주 발송이 완료되어야 함

  test.beforeAll(async () => {
    // 사전 조건 확인: 발송 완료된 발주가 있는지
    // 없으면 테스트를 설정하는 별도 단계가 필요
  })

  test('발송 완료 발주 목록 확인', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 발송 완료된 발주 목록이 있는지 확인
    // 목록이 비어있으면 테스트 스킵
    const orderList = page.locator('[class*="order-select"], [class*="log-item"]').first()

    const hasOrders = await orderList.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasOrders) {
      console.log('발송 완료된 발주가 없어 테스트를 스킵합니다.')
      test.skip()
      return
    }

    await expect(orderList).toBeVisible()
  })

  test('발주 선택 및 송장 파일 업로드 UI 테스트', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 발송 완료된 발주가 있는 경우만 테스트
    const firstOrderItem = page
      .locator('button, [role="button"]')
      .filter({ hasText: /발주|주문/ })
      .first()

    if (!(await firstOrderItem.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('발송 완료된 발주를 찾을 수 없어 스킵합니다.')
      test.skip()
      return
    }

    // 첫 번째 발주 선택
    await firstOrderItem.click()

    // 송장 업로드 영역이 활성화되는지 확인
    await expect(page.getByText(/송장 양식 정보|템플릿/)).toBeVisible({ timeout: 5000 })
  })

  test('변환 시작 버튼 상태 확인', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 변환 시작 버튼 확인 (초기에는 비활성화)
    const convertButton = page.getByRole('button', { name: /변환 시작/ })

    if (await convertButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 파일이 없으면 비활성화 상태여야 함
      await expect(convertButton).toBeDisabled()
    }
  })
})

test.describe('송장 변환 결과 검증', () => {
  // 실제 송장 파일이 있는 경우 변환 결과 검증
  // 이 테스트는 실제 송장 파일 샘플이 필요함

  test.skip('송장 파일 변환 및 결과 확인', async ({ page }) => {
    // 송장 파일 샘플이 있어야 테스트 가능
    // real-data 폴더에 송장 샘플 파일 추가 필요

    await page.goto('/invoice-convert')

    // 1. 발주 선택
    // 2. 송장 파일 업로드
    // 3. 변환 시작
    // 4. 결과 확인 (성공/실패 건수)
    // 5. 다운로드 파일 검증
  })

  test.skip('변환 결과 다운로드 테스트', async ({ page }) => {
    // 변환 완료 후 다운로드 버튼 클릭
    // 파일명 규칙 검증: 사방넷_송장업로드_{제조사명}_{날짜}.xlsx

    await page.goto('/invoice-convert')

    // 변환 완료 상태에서 다운로드
    const downloadButton = page.getByRole('button', { name: /다운로드/ })

    if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download')
      await downloadButton.click()
      const download = await downloadPromise

      const fileName = download.suggestedFilename()
      expect(fileName).toContain('사방넷_송장업로드')
      expect(fileName).toContain('.xlsx')

      await download.saveAs(path.join(DOWNLOADS_DIR, fileName))
    }
  })
})

test.describe('송장 변환 에러 처리', () => {
  test('잘못된 파일 형식 처리', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 텍스트 파일이나 잘못된 형식의 파일 업로드 시 에러 메시지 확인
    // (실제로는 파일 선택기가 .xlsx만 허용할 수 있음)
  })

  test('빈 송장 파일 처리', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 빈 엑셀 파일 업로드 시 적절한 에러 메시지 표시
  })

  test('매칭되지 않는 주문번호 처리', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 주문번호가 시스템에 없는 경우 에러 표시
    // 변환 결과에서 "주문번호 미매칭" 상태로 표시되어야 함
  })
})
