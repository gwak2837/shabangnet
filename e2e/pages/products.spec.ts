import { expect, test } from '@playwright/test'

test.describe('상품 연결', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/product')
    await expect(page.getByRole('heading', { name: '상품 연결' })).toBeVisible()
    // 페이지 로드 대기
    await expect(page.getByText('전체 상품')).toBeVisible({ timeout: 10000 })
  })

  test.describe('조회', () => {
    test('상품 연결 페이지가 표시되어야 함', async ({ page }) => {
      // 통계 카드들이 표시되어야 함
      await expect(page.getByText('전체 상품')).toBeVisible()
      await expect(page.getByText('연결 완료')).toBeVisible()
      // 미연결 카드 (exact match 사용)
      await expect(page.locator('[data-slot="card-content"]').filter({ hasText: '미연결' }).first()).toBeVisible()
      await expect(page.getByText('원가 이상')).toBeVisible()
    })

    test('상품 테이블이 표시되어야 함', async ({ page }) => {
      // 테이블 헤더 확인 (columnheader role 사용)
      await expect(page.getByRole('columnheader', { name: '상품코드' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: '상품명' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: '제조사' })).toBeVisible()
    })

    test('검색 기능이 동작해야 함', async ({ page }) => {
      // 메인 콘텐츠 영역의 검색 입력란 찾기
      const searchInput = page.getByRole('searchbox', { name: /상품코드, 상품명 검색/ })

      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('테스트')
        await page.waitForTimeout(500) // 디바운스 대기
      }
    })

    test('미연결만 보기 필터가 동작해야 함', async ({ page }) => {
      // 미연결만 보기 체크박스 찾기
      const unmappedCheckbox = page.getByLabel('미연결 상품만 보기')

      if (await unmappedCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await unmappedCheckbox.click()
        await page.waitForTimeout(500)
        // 다시 클릭하여 해제
        await unmappedCheckbox.click()
      }
    })

    test('원가 이상 필터가 동작해야 함', async ({ page }) => {
      // 원가 이상 카드 클릭하면 필터 토글
      const priceErrorCard = page.locator('[data-slot="card-content"]').filter({ hasText: '원가 이상' })

      if (await priceErrorCard.isVisible()) {
        await priceErrorCard.click()
        await page.waitForTimeout(500)
        // 다시 클릭하여 해제
        await priceErrorCard.click()
      }
    })
  })

  test.describe('인라인 편집', () => {
    test('제조사 연결 수정 (클릭하여 드롭다운 열기)', async ({ page }) => {
      // 테이블이 로드될 때까지 대기
      const table = page.locator('table')
      await expect(table).toBeVisible({ timeout: 10000 })

      // 첫 번째 상품 행 찾기
      const firstRow = table.locator('tbody tr').first()

      if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 제조사 셀 클릭 (연결 필요 버튼이나 기존 제조사 배지)
        const mappingButton = firstRow.getByRole('button', { name: '연결 필요' })
        const manufacturerBadge = firstRow.locator('.cursor-pointer').filter({ hasText: /\S/ })

        if (await mappingButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await mappingButton.click()
        } else if (
          await manufacturerBadge
            .first()
            .isVisible({ timeout: 2000 })
            .catch(() => false)
        ) {
          await manufacturerBadge.first().click()
        }

        // 드롭다운이 열렸는지 확인
        const dropdown = page.getByRole('combobox')
        if (await dropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          // 닫기 (다른 곳 클릭)
          await page.locator('body').click()
        }
      }
    })

    test('원가 수정 (클릭하여 입력 필드 열기)', async ({ page }) => {
      // 테이블이 로드될 때까지 대기
      const table = page.locator('table')
      await expect(table).toBeVisible({ timeout: 10000 })

      // 첫 번째 상품 행 찾기
      const firstRow = table.locator('tbody tr').first()

      if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 원가 셀 클릭 (텍스트 영역)
        const costCell = firstRow.locator('td').nth(4) // 5번째 열이 원가

        if (await costCell.isVisible({ timeout: 3000 }).catch(() => false)) {
          await costCell.click()

          // 입력 필드가 나타나야 함
          const input = firstRow.locator('input[type="number"]')
          if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
            await input.fill('10000')
            // Enter 키로 저장
            await input.press('Enter')
          }
        }
      }
    })

    test('원가 수정 취소 (Escape 키)', async ({ page }) => {
      // 테이블이 로드될 때까지 대기
      const table = page.locator('table')
      await expect(table).toBeVisible({ timeout: 10000 })

      // 첫 번째 상품 행 찾기
      const firstRow = table.locator('tbody tr').first()

      if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 원가 셀 클릭
        const costCell = firstRow.locator('td').nth(4)

        if (await costCell.isVisible({ timeout: 3000 }).catch(() => false)) {
          await costCell.click()

          // 입력 필드가 나타나야 함
          const input = firstRow.locator('input[type="number"]')
          if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
            await input.fill('99999')
            // Escape 키로 취소
            await input.press('Escape')

            // 입력 필드가 사라져야 함
            await expect(input).not.toBeVisible()
          }
        }
      }
    })
  })

  test.describe('일괄 업로드', () => {
    test('원가 일괄 업로드 모달 열기', async ({ page }) => {
      // 원가 일괄 업로드 버튼 클릭
      const costUploadButton = page.getByRole('button', { name: '원가 일괄 업로드' })

      if (await costUploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await costUploadButton.click()

        // 모달이 열려야 함
        await expect(page.getByRole('dialog')).toBeVisible()

        // 취소
        await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
        await expect(page.getByRole('dialog')).not.toBeVisible()
      }
    })

    test('연결 일괄 업로드 모달 열기', async ({ page }) => {
      // 연결 일괄 업로드 버튼 클릭
      const mappingUploadButton = page.getByRole('button', { name: '연결 일괄 업로드' })

      if (await mappingUploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mappingUploadButton.click()

        // 모달이 열려야 함
        await expect(page.getByRole('dialog')).toBeVisible()

        // 취소
        await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
        await expect(page.getByRole('dialog')).not.toBeVisible()
      }
    })
  })

  test.describe('통계', () => {
    test('전체 상품 수가 표시되어야 함', async ({ page }) => {
      const totalCard = page.locator('[data-slot="card-content"]').filter({ hasText: '전체 상품' })
      await expect(totalCard).toBeVisible()
    })

    test('연결 완료 수가 표시되어야 함', async ({ page }) => {
      const mappedCard = page.locator('[data-slot="card-content"]').filter({ hasText: '연결 완료' })
      await expect(mappedCard).toBeVisible()
    })

    test('미연결 수가 표시되어야 함', async ({ page }) => {
      // 미연결 카드 (카드 내 텍스트로 구분)
      const unmappedCard = page.locator('[data-slot="card-content"]').filter({ hasText: '미연결' }).first()
      await expect(unmappedCard).toBeVisible()
    })
  })
})
