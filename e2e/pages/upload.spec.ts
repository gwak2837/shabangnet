import { expect, test } from '@playwright/test'

import { INPUT_FILES, SABANGNET_TEST_CASES } from '../common/fixtures'

test.describe('주문 업로드', () => {
  const getManufacturer = (name: string) => SABANGNET_TEST_CASES.find((m) => m.manufacturer === name)!

  test('사방넷 원본 파일 업로드 및 파싱', async ({ page }) => {
    // 1. 업로드 페이지로 이동
    await page.goto('/upload')
    await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

    // 2. 사방넷 주문 탭이 선택되어 있는지 확인
    const sabangnetTab = page.getByRole('button', { name: /사방넷 주문/ })
    await expect(sabangnetTab).toBeVisible()

    // 3. 파일 업로드
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(INPUT_FILES.sabangnet)

    // 4. 처리 완료 대기
    await expect(page.getByText('파일을 분석하고 있습니다')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 5. 업로드 결과 확인
    // 성공적으로 처리된 주문 수 확인
    await expect(page.getByText(/처리된 주문/)).toBeVisible()

    // 6. 제조사별 분류 결과 확인
    // 고창베리세상, 로뎀푸드, 하늘명인 등 주요 제조사가 표시되어야 함 (exact: true로 정확한 텍스트만)
    await expect(page.getByText(getManufacturer('고창베리세상').manufacturer, { exact: true })).toBeVisible()
    await expect(page.getByText(getManufacturer('로뎀푸드').manufacturer, { exact: true })).toBeVisible()
    await expect(page.getByText(getManufacturer('하늘명인').manufacturer, { exact: true })).toBeVisible()
  })
})
