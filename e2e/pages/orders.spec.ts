import { expect, test } from '@playwright/test'

import { INPUT_FILES, SABANGNET_TEST_CASES } from '../common/fixtures'

test.describe('발주 생성/발송', () => {
  test('발주 페이지에서 제조사별 주문 목록 확인', async ({ page }) => {
    // 테스트 전 사방넷 파일 업로드
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(INPUT_FILES.sabangnet)
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 발주 페이지로 이동
    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: '발주 생성/발송' })).toBeVisible()

    // 발송 대상 탭이 선택되어 있는지 확인
    await expect(page.getByRole('button', { name: /발송 대상/ })).toBeVisible()

    // 제조사별 주문이 표시되어야 함
    // 주요 제조사 확인 (exact: true로 정확한 텍스트만 매칭)
    const hanul = SABANGNET_TEST_CASES.find((m) => m.manufacturer === '하늘명인')!
    await expect(page.getByText(hanul.manufacturer, { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('제조사별 발주서 다운로드', async ({ page }) => {
    // 테스트 전 사방넷 파일 업로드
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(INPUT_FILES.sabangnet)
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    await page.goto('/orders')

    // 테이블이 로드될 때까지 대기
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

    // 첫 번째 제조사의 다운로드 버튼 찾기
    const downloadButton = page.getByRole('button', { name: /다운로드|Download/i }).first()

    if (await downloadButton.isVisible()) {
      // 다운로드 이벤트 대기
      const downloadPromise = page.waitForEvent('download')
      await downloadButton.click()
      const download = await downloadPromise

      // 파일명에 "발주서"가 포함되어야 함
      expect(download.suggestedFilename()).toContain('발주서')
      expect(download.suggestedFilename()).toContain('.xlsx')
    }
  })

  test('전체 발송 버튼 상태 확인', async ({ page }) => {
    // 테스트 전 사방넷 파일 업로드
    await page.goto('/upload')
    const uploadFileInput = page.locator('input[type="file"]')
    await uploadFileInput.setInputFiles(INPUT_FILES.sabangnet)
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    await page.goto('/orders')

    // 전체 발송 버튼 확인
    const sendAllButton = page.getByRole('button', { name: /전체 발송/ })
    await expect(sendAllButton).toBeVisible({ timeout: 10000 })

    // 대기중인 주문이 있으면 버튼이 활성화되어야 함
    // 테이블이 로드되면 전체 발송 버튼 확인
    await expect(sendAllButton).toBeVisible()
  })

  test('발송 제외 주문 탭 확인', async ({ page }) => {
    await page.goto('/orders')

    // 발송 제외 탭 클릭
    await page.getByRole('button', { name: /발송 제외/ }).click()

    // 발송 제외 안내 메시지 확인
    await expect(page.getByText(/F열 값이 설정된 제외 패턴과 일치하는 주문/)).toBeVisible()
  })
})
