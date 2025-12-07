import { expect, test } from '@playwright/test'

// 테스트 실행마다 고유한 타임스탬프 생성 (중복 키 방지)
const TIMESTAMP = Date.now()

const TEST_COURIER = {
  name: `E2E테스트택배_${TIMESTAMP}`,
  code: '99',
  aliases: [`E2E택배_${TIMESTAMP}`, `E2E운송_${TIMESTAMP}`],
}

const TEST_EXCLUSION_PATTERN = {
  pattern: `[E2E]테스트_제외패턴_${TIMESTAMP}`,
  description: 'E2E 테스트용 제외 패턴',
}

const TEST_SYNONYM = {
  standardKey: 'productName',
  standardKeyLabel: '상품명',
  synonym: `E2E테스트상품명컬럼_${TIMESTAMP}`,
}

test.describe('주문 설정 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/order')
    // 페이지 로드 대기 - 첫 번째 카드 제목 확인
    await expect(page.locator('section.glass-card h2').filter({ hasText: '택배사' }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test.describe('택배사 매핑', () => {
    test('택배사 목록이 표시되어야 함', async ({ page }) => {
      // 시드된 택배사 중 하나가 보여야 함 (카드 아이템에서 찾기)
      await expect(page.locator('.glass-panel').filter({ hasText: 'CJ대한통운' }).first()).toBeVisible()
    })

    test('새 택배사 추가', async ({ page }) => {
      // 택배사 섹션의 추가 버튼 클릭
      const courierSection = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("택배사")') })
      await courierSection.getByRole('button', { name: '추가' }).click()

      // 모달 확인
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('새 택배사')).toBeVisible()

      // 폼 입력
      await page.getByRole('dialog').locator('#courier-name').fill(TEST_COURIER.name)
      await page.getByRole('dialog').locator('#courier-code').fill(TEST_COURIER.code)

      // 별칭 추가
      for (const alias of TEST_COURIER.aliases) {
        await page.getByRole('dialog').locator('input[name="alias"]').fill(alias)
        await page.getByRole('dialog').getByRole('button', { name: '추가', exact: true }).click()
        await expect(page.getByRole('dialog').getByText(alias)).toBeVisible()
      }

      // 저장
      await page.getByRole('dialog').getByRole('button', { name: '저장' }).click()

      // 모달 닫힘 확인
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // 목록에 추가된 택배사 확인
      await expect(page.locator('.glass-panel').filter({ hasText: TEST_COURIER.name })).toBeVisible()
    })

    test('택배사 수정', async ({ page }) => {
      // 첫 번째 택배사 아이템의 수정 버튼 클릭
      const courierSection = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("택배사")') })
      const firstItem = courierSection.locator('.glass-panel').first()
      await firstItem
        .locator('button')
        .filter({ has: page.locator('svg.lucide-pencil') })
        .click()

      // 모달 확인
      await expect(page.getByRole('dialog')).toBeVisible()

      // 이름 수정
      const nameInput = page.getByRole('dialog').locator('#courier-name')
      const currentName = await nameInput.inputValue()
      await nameInput.fill(`${currentName}_수정됨`)

      // 저장
      await page.getByRole('dialog').getByRole('button', { name: '저장' }).click()

      // 변경 확인
      await expect(
        page
          .locator('.glass-panel')
          .filter({ hasText: `${currentName}_수정됨` })
          .first(),
      ).toBeVisible()
    })

    test('택배사 활성화/비활성화 토글', async ({ page }) => {
      // 택배사 섹션 찾기
      const courierSection = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("택배사")') })
      const firstItem = courierSection.locator('.glass-panel').first()
      const toggle = firstItem.locator('button[role="switch"]')

      // 토글 클릭
      await toggle.click()

      // 토스트 메시지로 성공 확인
      await expect(page.getByText('택배사 매핑이 수정되었습니다')).toBeVisible({ timeout: 5000 })
    })

    test('택배사 삭제', async ({ page }) => {
      // 택배사 섹션 찾기
      const courierSection = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("택배사")') })
      // 테스트용 택배사가 있는지 확인하고 삭제
      const testCourierItem = courierSection.locator('.glass-panel').filter({ hasText: TEST_COURIER.name })

      if (await testCourierItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 삭제 버튼 클릭 (휴지통 아이콘)
        await testCourierItem
          .locator('button')
          .filter({ has: page.locator('svg.lucide-trash-2') })
          .click()

        // 삭제 확인
        await expect(testCourierItem).not.toBeVisible()
      }
    })
  })

  test.describe('발송 제외 패턴', () => {
    test('제외 패턴 목록이 표시되어야 함', async ({ page }) => {
      await expect(page.locator('section.glass-card h2').filter({ hasText: '발송 제외 설정' })).toBeVisible()
      // 시드된 패턴 중 하나가 보여야 함
      await expect(page.getByText('[30002002]주문_센터택배').first()).toBeVisible()
    })

    test('새 제외 패턴 추가', async ({ page }) => {
      // 발송 제외 설정 섹션 내의 입력란 찾기
      const section = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("발송 제외 설정")') })

      // 패턴 입력
      await section.locator('input.font-mono').fill(TEST_EXCLUSION_PATTERN.pattern)
      await section.locator('input[placeholder="설명 (선택사항)"]').fill(TEST_EXCLUSION_PATTERN.description)

      // 추가 버튼 클릭
      await section.getByRole('button', { name: '추가' }).click()

      // 추가된 패턴 확인 (중복 요소가 있을 수 있으므로 .first() 사용)
      await expect(page.getByText(TEST_EXCLUSION_PATTERN.pattern).first()).toBeVisible()
    })

    test('제외 패턴 수정', async ({ page }) => {
      // 발송 제외 설정 섹션의 패턴 아이템 찾기
      const section = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("발송 제외 설정")') })
      const firstPatternItem = section
        .locator('.glass-panel')
        .filter({ has: page.locator('.font-mono') })
        .first()
      await firstPatternItem
        .locator('button')
        .filter({ has: page.locator('svg.lucide-pencil') })
        .click()

      // 모달 확인
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('패턴 편집')).toBeVisible()

      // 설명 수정
      await page.getByRole('dialog').locator('#edit-description').fill('수정된 설명')

      // 저장
      await page.getByRole('dialog').getByRole('button', { name: '저장' }).click()

      // 모달 닫힘 확인
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('제외 패턴 활성화/비활성화 토글', async ({ page }) => {
      // 발송 제외 설정 섹션 찾기
      const section = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("발송 제외 설정")') })

      // 메인 토글이 활성화되어 있어야 개별 패턴 토글을 클릭할 수 있음
      const mainToggle = section
        .locator('.glass-panel')
        .filter({ hasText: '자동 필터링 사용' })
        .locator('button[role="switch"]')
      const isMainEnabled = (await mainToggle.getAttribute('data-state')) === 'checked'

      // 메인 토글이 비활성화되어 있으면 먼저 활성화
      if (!isMainEnabled) {
        await mainToggle.click()
        await expect(page.getByText('설정이 저장되었습니다')).toBeVisible({ timeout: 5000 })
      }

      // 첫 번째 패턴의 토글 스위치
      const firstPatternItem = section
        .locator('.glass-panel')
        .filter({ has: page.locator('.font-mono') })
        .first()
      const toggle = firstPatternItem.locator('button[role="switch"]')

      // 토글이 활성화되어 있는지 확인 후 클릭
      if (await toggle.isEnabled()) {
        await toggle.click()
        // 토스트 메시지로 성공 확인
        await expect(page.getByText('패턴이 수정되었습니다')).toBeVisible({ timeout: 5000 })
      }
    })

    test('발송 제외 필터 전체 활성화/비활성화', async ({ page }) => {
      // 발송 제외 설정 섹션 찾기
      const section = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("발송 제외 설정")') })
      // 전체 활성화 토글
      const mainToggle = section
        .locator('.glass-panel')
        .filter({ hasText: '자동 필터링 사용' })
        .locator('button[role="switch"]')
      await mainToggle.click()

      // 저장 메시지 확인 (정확한 텍스트 매칭)
      await expect(page.getByText('설정이 저장되었습니다', { exact: true })).toBeVisible()
    })
  })

  test.describe('컬럼 동의어', () => {
    test('동의어 섹션이 표시되어야 함', async ({ page }) => {
      await expect(page.locator('section.glass-card h2').filter({ hasText: '컬럼 동의어 사전' })).toBeVisible()
    })

    test('새 동의어 추가', async ({ page }) => {
      // 동의어 섹션 찾기
      const section = page
        .locator('section.glass-card')
        .filter({ has: page.locator('h2:has-text("컬럼 동의어 사전")') })

      // 표준 컬럼 선택
      await section.getByRole('combobox').click()
      await page.getByRole('option', { name: TEST_SYNONYM.standardKeyLabel }).click()

      // 동의어 입력
      await section.locator('input[placeholder*="동의어 입력"]').fill(TEST_SYNONYM.synonym)

      // 추가 버튼 클릭
      await section.getByRole('button', { name: '추가' }).click()

      // 페이지 재렌더링 대기 (추가 후 상태 업데이트)
      await page.waitForTimeout(1000)

      // 해당 표준 컬럼 섹션 펼치기 (details 요소의 summary 클릭)
      const detailsGroup = section.locator('details').filter({ hasText: TEST_SYNONYM.standardKeyLabel })
      await expect(detailsGroup).toBeVisible({ timeout: 5000 })
      await detailsGroup.locator('summary').click()

      // 추가된 동의어 확인
      await expect(page.getByText(TEST_SYNONYM.synonym)).toBeVisible()
    })

    test('중복 동의어 추가 시 에러 처리', async ({ page }) => {
      // 동의어 섹션 찾기
      const section = page
        .locator('section.glass-card')
        .filter({ has: page.locator('h2:has-text("컬럼 동의어 사전")') })

      // 섹션이 보이도록 스크롤
      await section.scrollIntoViewIfNeeded()

      // 시드 데이터에 있는 기존 동의어 사용 (상품명 - 품명)
      const existingSynonym = '품명'

      // 표준 컬럼 선택 - 스크롤 후 클릭
      const combobox = section.getByRole('combobox')
      await combobox.scrollIntoViewIfNeeded()
      await combobox.click()
      // 옵션이 뷰포트 안에 들어올 때까지 대기 후 클릭
      const option = page.getByRole('option', { name: '상품명' })
      await option.scrollIntoViewIfNeeded()
      await option.click()

      // 기존에 있는 동의어 입력
      await section.locator('input[placeholder*="동의어 입력"]').fill(existingSynonym)

      // 추가 버튼 클릭
      await section.getByRole('button', { name: '추가' }).click()

      // 에러 토스트 확인
      await expect(page.locator('[data-sonner-toast]').getByText(/이미 존재/)).toBeVisible({ timeout: 5000 })
    })

    test('동의어 그룹 펼치기/접기', async ({ page }) => {
      // 동의어 섹션 찾기
      const section = page
        .locator('section.glass-card')
        .filter({ has: page.locator('h2:has-text("컬럼 동의어 사전")') })

      // 상품명 그룹 클릭하여 펼치기 (details 요소)
      const productNameGroup = section.locator('details').filter({ hasText: '상품명' })
      await productNameGroup.locator('summary').click()

      // 펼쳐진 내용 확인 (동의어가 보여야 함)
      await page.waitForTimeout(300)

      // 다시 클릭하여 접기
      await productNameGroup.locator('summary').click()
    })

    test('동의어 활성화/비활성화 토글', async ({ page }) => {
      // 동의어 섹션 찾기
      const section = page
        .locator('section.glass-card')
        .filter({ has: page.locator('h2:has-text("컬럼 동의어 사전")') })

      // 상품명 그룹 펼치기 (details 요소)
      const productNameGroup = section.locator('details').filter({ hasText: '상품명' })
      await productNameGroup.locator('summary').click()

      // 첫 번째 동의어의 토글 찾기 (details 내부의 동의어 아이템)
      const synonymItem = productNameGroup.locator('[aria-checked]').first()
      const toggle = synonymItem.locator('button[role="switch"]')

      if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await toggle.click()
        await page.waitForTimeout(500)
        // 원래 상태로 복원
        await toggle.click()
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('쇼핑몰 템플릿', () => {
    test('쇼핑몰 템플릿 목록이 표시되어야 함', async ({ page }) => {
      await expect(page.locator('section.glass-card h2').filter({ hasText: '쇼핑몰 템플릿' })).toBeVisible()
    })

    test('쇼핑몰 템플릿 추가 모달 열기', async ({ page }) => {
      // 쇼핑몰 템플릿 섹션의 추가 버튼 클릭
      const section = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("쇼핑몰 템플릿")') })
      await section.getByRole('button', { name: '추가' }).click()

      // 모달 확인
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('쇼핑몰 정보와 컬럼 매핑을 설정합니다')).toBeVisible()

      // 쇼핑몰 ID 입력
      await page.getByRole('dialog').locator('#mall-name').fill('e2e_test_mall')
      await page.getByRole('dialog').locator('#display-name').fill('E2E테스트몰')

      // 취소
      await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('기존 쇼핑몰 템플릿 수정 모달 열기', async ({ page }) => {
      // 쇼핑몰 템플릿 섹션 찾기
      const section = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("쇼핑몰 템플릿")') })

      // 시드된 템플릿이 있다면 수정 버튼 클릭
      const firstItem = section.locator('.glass-panel').first()

      if (await firstItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 수정 버튼 클릭 (Pencil 아이콘)
        await firstItem
          .locator('button')
          .filter({ has: page.locator('svg.lucide-pencil') })
          .click()

        // 모달 확인
        await expect(page.getByRole('dialog')).toBeVisible()

        // 취소
        await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
      }
    })

    test('쇼핑몰 템플릿 활성화/비활성화 토글', async ({ page }) => {
      // 쇼핑몰 템플릿 섹션 찾기
      const section = page.locator('section.glass-card').filter({ has: page.locator('h2:has-text("쇼핑몰 템플릿")') })
      const firstItem = section.locator('.glass-panel').first()

      if (await firstItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        const toggle = firstItem.locator('button[role="switch"]')
        if (await toggle.isVisible()) {
          // 토글 클릭
          await toggle.click()

          // 토스트 메시지로 성공 확인
          await expect(page.getByText('쇼핑몰 템플릿이 수정되었습니다')).toBeVisible({ timeout: 5000 })
        }
      }
    })
  })
})
