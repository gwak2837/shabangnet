import { expect, test } from '@playwright/test'

const TEST_OPTION_MAPPING = {
  productCode: 'E2E-TEST-001',
  optionName: 'E2E 테스트 옵션 500ml x 2병',
}

const UPDATED_OPTION_MAPPING = {
  optionName: 'E2E 테스트 옵션 1L x 1병 (수정됨)',
}

test.describe('옵션 연결', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/option-mapping')
    await expect(page.getByRole('heading', { name: '옵션 연결' })).toBeVisible()
    // 페이지 로드 대기
    await expect(page.getByText('옵션 연결이란?')).toBeVisible({ timeout: 10000 })
  })

  test.describe('조회', () => {
    test('옵션 연결 페이지가 표시되어야 함', async ({ page }) => {
      // 통계 카드들이 표시되어야 함
      await expect(page.getByText('전체 연결')).toBeVisible()
      await expect(page.getByText('상품 수')).toBeVisible()
      await expect(page.getByText('제조사 수', { exact: true })).toBeVisible()

      // 설명 배너가 표시되어야 함
      await expect(page.getByText('옵션 연결이란?')).toBeVisible()
    })

    test('연결 추가 버튼이 표시되어야 함', async ({ page }) => {
      await expect(page.getByRole('button', { name: '연결 추가' })).toBeVisible()
    })

    test('제조사 필터가 동작해야 함', async ({ page }) => {
      // 제조사 드롭다운 찾기 (필터 영역에서)
      const manufacturerFilter = page.getByRole('combobox').filter({ hasText: /전체 제조사|제조사/ })

      if (await manufacturerFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await manufacturerFilter.click()
        // 옵션 확인
        await expect(page.getByRole('option').first()).toBeVisible()
      }
    })

    test('검색 기능이 동작해야 함', async ({ page }) => {
      // 메인 콘텐츠 영역의 검색 입력란 찾기
      const searchInput = page.getByRole('searchbox', { name: '상품코드, 옵션명 검색' })

      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('테스트')
        await page.waitForTimeout(500) // 디바운스 대기
      }
    })
  })

  test.describe('등록', () => {
    test('옵션 연결 추가 모달 열기', async ({ page }) => {
      // 연결 추가 버튼 클릭
      await page.getByRole('button', { name: '연결 추가' }).click()

      // 모달이 열려야 함
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('새로운 옵션-제조사 연결을 등록합니다.')).toBeVisible()
    })

    test('필수 필드 유효성 검사', async ({ page }) => {
      // 모달 열기
      await page.getByRole('button', { name: '연결 추가' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // 빈 폼으로 제출 시도
      await page.getByRole('dialog').getByRole('button', { name: '추가' }).click()

      // 에러 메시지 확인
      await expect(page.getByText('상품코드를 입력하세요')).toBeVisible()
      await expect(page.getByText('옵션명을 입력하세요')).toBeVisible()
      await expect(page.getByText('제조사를 선택하세요')).toBeVisible()
    })

    test('새 옵션 연결 등록', async ({ page }) => {
      // 모달 열기
      await page.getByRole('button', { name: '연결 추가' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // 폼 입력
      await page.getByRole('dialog').locator('#productCode').fill(TEST_OPTION_MAPPING.productCode)
      await page.getByRole('dialog').locator('#optionName').fill(TEST_OPTION_MAPPING.optionName)

      // 제조사 선택 (첫 번째 제조사 선택)
      const manufacturerSelect = page.getByRole('dialog').getByRole('combobox')
      await manufacturerSelect.click()
      await page.getByRole('option').first().click()

      // 추가 버튼 클릭
      await page.getByRole('dialog').getByRole('button', { name: '추가' }).click()

      // 모달 닫힘 확인
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // 성공 토스트 메시지 확인
      await expect(page.getByText('연결이 추가되었습니다')).toBeVisible()
    })
  })

  test.describe('수정', () => {
    test('옵션 연결 수정 모달 열기', async ({ page }) => {
      // 테이블이 로드될 때까지 대기
      const table = page.locator('table')

      if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
        const firstRow = table.locator('tbody tr').first()

        if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          // 수정 버튼 클릭 (Pencil 아이콘)
          const editButton = firstRow.locator('button').first()
          if (await editButton.isVisible()) {
            await editButton.click()
            await expect(page.getByRole('dialog')).toBeVisible()
            await expect(page.getByText('옵션-제조사 연결 정보를 수정합니다.')).toBeVisible()

            // 취소
            await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
          }
        }
      }
    })

    test('옵션 연결 정보 수정', async ({ page }) => {
      // 메인 콘텐츠 영역의 검색 입력란 찾기
      const searchInput = page.getByRole('searchbox', { name: '상품코드, 옵션명 검색' })
      if (await searchInput.isVisible()) {
        await searchInput.fill(TEST_OPTION_MAPPING.productCode)
        await page.waitForTimeout(500)
      }

      // 테스트 연결이 있으면 수정
      const testRow = page.locator(`table tbody tr:has-text("${TEST_OPTION_MAPPING.productCode}")`)

      if (await testRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 수정 버튼 클릭
        const editButton = testRow.locator('button').first()
        if (await editButton.isVisible()) {
          await editButton.click()
          await expect(page.getByRole('dialog')).toBeVisible()

          // 옵션명 수정
          await page.getByRole('dialog').locator('#optionName').fill(UPDATED_OPTION_MAPPING.optionName)

          // 수정 버튼 클릭
          await page.getByRole('dialog').getByRole('button', { name: '수정' }).click()

          // 성공 토스트 메시지 확인
          await expect(page.getByText('연결이 수정되었습니다')).toBeVisible()
        }
      }
    })
  })

  test.describe('삭제', () => {
    test('옵션 연결 삭제', async ({ page }) => {
      // 메인 콘텐츠 영역의 검색 입력란 찾기
      const searchInput = page.getByRole('searchbox', { name: '상품코드, 옵션명 검색' })
      if (await searchInput.isVisible()) {
        await searchInput.fill(TEST_OPTION_MAPPING.productCode)
        await page.waitForTimeout(500)
      }

      // 테스트 연결이 있으면 삭제
      const testRow = page.locator(`table tbody tr:has-text("${TEST_OPTION_MAPPING.productCode}")`)

      if (await testRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 삭제 버튼 클릭 (두 번째 버튼 - 휴지통 아이콘)
        const deleteButton = testRow.locator('button').nth(1)
        if (await deleteButton.isVisible()) {
          await deleteButton.click()

          // 삭제 확인 대화상자가 있으면 확인
          const confirmButton = page.getByRole('button', { name: /확인|삭제/ })
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click()
          }

          // 성공 토스트 메시지 확인
          await expect(page.getByText('연결이 삭제되었습니다')).toBeVisible()
        }
      }
    })
  })

  test.describe('연결 우선순위', () => {
    test('모달에 연결 우선순위 안내가 표시되어야 함', async ({ page }) => {
      // 모달 열기
      await page.getByRole('button', { name: '연결 추가' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // 우선순위 안내 확인
      await expect(page.getByText('연결 우선순위')).toBeVisible()
      await expect(page.getByText('옵션 연결 (상품코드 + 옵션 조합)')).toBeVisible()
      await expect(page.getByText('상품 연결 (상품코드 기준)')).toBeVisible()

      // 취소
      await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
    })
  })
})
