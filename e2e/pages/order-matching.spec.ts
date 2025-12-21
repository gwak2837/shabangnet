import { expect, test } from '@playwright/test'

import { INPUT_FILES } from '../common/fixtures'

interface MatchingResponse {
  missingEmailManufacturers: { id: number; name: string; orderCount: number }[]
  unmappedProducts: { orderCount: number; productCode: string; productName: string }[]
  unmatchedProductCodes: { orderCount: number; productCode: string; productNameSample: string }[]
}

test.describe('발주 준비 / 제조사 연결', () => {
  test('매칭 데이터가 로드되고 화면에 반영돼요', async ({ page }) => {
    test.setTimeout(90_000)

    // 1) 사방넷 업로드로 데이터 준비
    await page.goto('/upload/sabangnet')
    await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

    const uploadResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/upload/sabangnet') && res.request().method() === 'POST'
    })
    await page.locator('input[type="file"]').setInputFiles(INPUT_FILES.sabangnet)
    const uploadResponse = await uploadResponsePromise
    expect(uploadResponse.ok()).toBe(true)
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 60_000 })

    // 2) 발주 준비 페이지 이동 → matching API 응답 기반으로 검증
    const matchingResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/orders/matching') && res.request().method() === 'GET'
    })

    await page.goto('/order/matching')
    const matchingResponse = await matchingResponsePromise
    expect(matchingResponse.ok()).toBe(true)

    const data = (await matchingResponse.json()) as MatchingResponse

    // 카드 라벨
    await expect(page.getByText('발송 이메일 미설정').first()).toBeVisible()
    await expect(page.getByText('제조사 연결 필요(주문 기준)').first()).toBeVisible()
    await expect(page.getByText('제조사 연결 필요(상품 기준)').first()).toBeVisible()

    // 카드 카운트(응답 기반)
    await expect(page.getByText(`${data.missingEmailManufacturers.length}곳`).first()).toBeVisible()
    await expect(page.getByText(`${data.unmatchedProductCodes.length}개`).first()).toBeVisible()
    await expect(page.getByText(`${data.unmappedProducts.length}개`).first()).toBeVisible()

    // 이메일 미설정 제조사 리스트(있으면 일부라도 노출)
    if (data.missingEmailManufacturers.length > 0) {
      await expect(page.getByText('이메일 설정이 필요한 제조사')).toBeVisible()
      await expect(page.getByText(data.missingEmailManufacturers[0]!.name).first()).toBeVisible()
    }

    // 제조사 미연결 주문(주문 기준)
    if (data.unmatchedProductCodes.length === 0) {
      await expect(page.getByText('제조사 미연결 주문이 없어요')).toBeVisible()
    } else {
      await expect(page.locator('table')).toBeVisible()
      await expect(page.getByText(data.unmatchedProductCodes[0]!.productCode, { exact: true })).toBeVisible()
    }
  })
})


