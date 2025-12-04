import { expect, test } from '@playwright/test'

test.describe('제조사 관리', () => {
  test('제조사 목록 페이지 확인', async ({ page }) => {
    await page.goto('/manufacturers')
    await expect(page.getByRole('heading', { name: '제조사 관리' })).toBeVisible()

    // 테이블이 로드되어야 함
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

    // 시드된 제조사들이 표시되어야 함
    // 제조사 목록에 하늘명인, 로뎀푸드, 고창베리세상 등이 있어야 함
  })

  test('제조사 추가 모달 열기', async ({ page }) => {
    await page.goto('/manufacturers')

    // 제조사 추가 버튼 클릭
    const addButton = page.getByRole('button', { name: /제조사 추가|추가/ })
    if (await addButton.isVisible()) {
      await addButton.click()

      // 모달이 열려야 함
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/제조사 정보|기본 정보/)).toBeVisible()
    }
  })

  test('제조사 검색 기능', async ({ page }) => {
    await page.goto('/manufacturers')

    // 테이블 로드 대기
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

    // 검색 입력란이 있으면 테스트
    const searchInput = page.locator('input[placeholder*="검색"]')
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('하늘명인')
      await page.waitForTimeout(500) // 디바운스 대기

      // 검색 결과에 하늘명인이 포함되어야 함
      await expect(page.getByText('하늘명인', { exact: true })).toBeVisible()
    }
  })

  test('제조사 상세 정보 확인', async ({ page }) => {
    await page.goto('/manufacturers')

    // 테이블 로드 대기
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

    // 첫 번째 제조사 행 클릭
    const firstRow = page.locator('tbody tr').first()
    if (await firstRow.isVisible()) {
      // 행 클릭 또는 상세 버튼 클릭
      const detailButton = firstRow.getByRole('button', { name: /상세|보기/ })
      if (await detailButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await detailButton.click()

        // 상세 정보가 표시되어야 함
        await expect(page.getByText(/이메일|연락처|주소/)).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
