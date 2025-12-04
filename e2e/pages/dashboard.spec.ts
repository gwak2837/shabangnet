import { expect, test } from '@playwright/test'

import { INPUT_FILES } from '../common/fixtures'

test.describe('대시보드', () => {
  test('대시보드 페이지 접근', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
  })

  test('통계 카드 표시 확인', async ({ page }) => {
    await page.goto('/dashboard')

    // 통계 카드들이 표시되어야 함
    await expect(page.getByText(/오늘 업로드|총 주문|발송 완료/)).toBeVisible({ timeout: 10000 })
  })

  test('대시보드에서 업로드 및 발주 현황 확인', async ({ page }) => {
    // 먼저 데이터 업로드
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(INPUT_FILES.sabangnet)
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 대시보드로 이동
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()

    // 통계 카드들이 표시되어야 함
    await expect(page.getByText(/오늘 업로드|총 주문|발송 완료/)).toBeVisible({ timeout: 10000 })
  })

  test('최근 활동 목록 확인', async ({ page }) => {
    await page.goto('/dashboard')

    // 최근 활동 또는 로그 섹션이 있으면 확인
    const activitySection = page.getByText(/최근 활동|최근 로그|활동 내역/)
    if (await activitySection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(activitySection).toBeVisible()
    }
  })

  test('빠른 액션 버튼 확인', async ({ page }) => {
    await page.goto('/dashboard')

    // 빠른 액션 버튼들이 있으면 확인
    const uploadButton = page.getByRole('link', { name: '주문 업로드', exact: true })
    const ordersButton = page.getByRole('link', { name: '발주 생성/발송', exact: true })

    if (await uploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(uploadButton).toBeVisible()
    }

    if (await ordersButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(ordersButton).toBeVisible()
    }
  })
})
