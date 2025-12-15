export const DEFAULT_MANUFACTURER_EMAIL_SUBJECT_TEMPLATE = '[다온에프앤씨 발주서]_{제조사명}_{날짜}'
export const DEFAULT_MANUFACTURER_EMAIL_BODY_TEMPLATE =
  '안녕하세요. (주)다온에프앤씨 발주 첨부파일 드립니다. 감사합니다.'

export interface ManufacturerEmailTemplateFields {
  emailBodyTemplate: string | null
  emailSubjectTemplate: string | null
}

export interface ManufacturerOrderEmailVariables {
  fileDate: string // YYYYMMDD
  manufacturerName: string
  orderDate: string // ko-KR formatted
  senderName: string
  totalItems?: number
}

export function renderManufacturerOrderEmail(
  fields: ManufacturerEmailTemplateFields,
  variables: Omit<ManufacturerOrderEmailVariables, 'fileDate'> & { date: Date },
): { html: string; subject: string; text: string } {
  const resolved = resolveManufacturerEmailTemplates(fields)

  const vars: ManufacturerOrderEmailVariables = {
    manufacturerName: variables.manufacturerName,
    senderName: variables.senderName,
    orderDate: variables.orderDate,
    totalItems: variables.totalItems,
    fileDate: formatDateForFileName(variables.date),
  }

  const subject = renderTemplateString(resolved.emailSubjectTemplate, vars).trim() || '(제목 없음)'
  const renderedBody = renderTemplateString(resolved.emailBodyTemplate, vars).trim()

  // If template looks like HTML, pass it through and derive a best-effort text alternative.
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(renderedBody)
  if (looksLikeHtml) {
    const text = renderedBody
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return { subject, text, html: renderedBody }
  }

  const text = renderedBody
  const html = `<div style="white-space:pre-wrap; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">${escapeHtml(renderedBody)}</div>`

  return { subject, text, html }
}

export function resolveManufacturerEmailTemplates(fields: ManufacturerEmailTemplateFields): {
  emailBodyTemplate: string
  emailSubjectTemplate: string
} {
  return {
    emailSubjectTemplate: fields.emailSubjectTemplate ?? DEFAULT_MANUFACTURER_EMAIL_SUBJECT_TEMPLATE,
    emailBodyTemplate: fields.emailBodyTemplate ?? DEFAULT_MANUFACTURER_EMAIL_BODY_TEMPLATE,
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatDateForFileName(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function renderTemplateString(template: string, variables: ManufacturerOrderEmailVariables): string {
  const replacements: Record<string, string> = {
    manufacturerName: variables.manufacturerName,
    senderName: variables.senderName,
    orderDate: variables.orderDate,
    fileDate: variables.fileDate,
    totalItems: variables.totalItems != null ? String(variables.totalItems) : '',
  }

  // 1) Legacy Korean placeholders: {제조사명}, {날짜}, {발신자명}
  let out = template
    .replaceAll('{제조사명}', variables.manufacturerName)
    .replaceAll('{날짜}', variables.fileDate)
    .replaceAll('{발신자명}', variables.senderName)

  // 2) Handlebars-like placeholders: {{ manufacturerName }}
  out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (key in replacements) {
      return replacements[key] ?? ''
    }
    return match
  })

  return out
}
