/**
 * 쇼핑몰 주문 엑셀 다운로드
 */
export async function downloadShoppingMallExcel(uploadId: number, fallbackName?: string): Promise<void> {
  const response = await fetch('/api/upload/shopping-mall-export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId }),
  })

  if (!response.ok) {
    const { error } = (await response.json()) as { error?: string }
    throw new Error(error || '다운로드에 실패했어요')
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition')
  const fileName =
    getFileNameFromDisposition(disposition) ??
    `${fallbackName || '쇼핑몰'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * Content-Disposition 헤더에서 파일명 추출
 */
export function getFileNameFromDisposition(disposition: string | null): string | null {
  if (!disposition) {
    return null
  }

  const match = disposition.match(/filename="(?<name>.+?)"/i)
  return match?.groups?.name ? decodeURIComponent(match.groups.name) : null
}
