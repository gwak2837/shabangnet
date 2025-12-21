import { expect, test } from '@playwright/test'

interface LogListResponse {
  items: unknown[]
  nextCursor: string | null
  summary: {
    failedLogs: number
    successLogs: number
    totalLogs: number
  }
}

test.describe('발송 기록', () => {
  test('발송 기록이 로드되고 필터가 요청에 반영돼요', async ({ page }) => {
    test.setTimeout(60_000)

    const initialLogsResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/order/history?') && res.request().method() === 'GET'
    })

    await page.goto('/order/history')
    const initialLogsResponse = await initialLogsResponsePromise
    expect(initialLogsResponse.ok()).toBe(true)

    const initial = (await initialLogsResponse.json()) as LogListResponse

    // Summary cards (응답 기반)
    await expect(page.getByText('전체 발송')).toBeVisible()
    await expect(page.getByText('성공')).toBeVisible()
    await expect(page.getByText('실패')).toBeVisible()

    await expect(page.getByText(`${initial.summary.totalLogs}건`).first()).toBeVisible()
    await expect(page.getByText(`${initial.summary.successLogs}건`).first()).toBeVisible()
    await expect(page.getByText(`${initial.summary.failedLogs}건`).first()).toBeVisible()

    if (initial.summary.totalLogs === 0) {
      await expect(page.getByText('발송 기록이 없습니다.')).toBeVisible()
    }

    // Status filter: 성공 선택 → status=success 요청 발생
    const statusSuccessResponsePromise = page.waitForResponse((res) => {
      return res.url().includes('/api/order/history?') && res.url().includes('status=success') && res.request().method() === 'GET'
    })

    const statusTrigger = page.locator('[data-slot="select-trigger"]').first()
    await statusTrigger.click()
    await page.getByRole('option', { name: '성공' }).click()

    const filteredResponse = await statusSuccessResponsePromise
    expect(filteredResponse.ok()).toBe(true)

    // 필터 초기화 버튼 노출
    await expect(page.getByRole('button', { name: '필터 초기화' })).toBeVisible()
  })
})


