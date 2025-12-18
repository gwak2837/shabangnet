import 'server-only'

import { ORDER_EMAIL_TEMPLATE_SLUG, type OrderEmailTemplateVariables } from '@/common/constants/order-email-template'

import { type EmailTemplate, getEmailTemplateBySlug, renderTemplate } from './templates'

export async function getOrderEmailTemplateOrThrow(): Promise<EmailTemplate> {
  const template = await getEmailTemplateBySlug(ORDER_EMAIL_TEMPLATE_SLUG)

  if (!template) {
    throw new Error('이메일 템플릿이 아직 설정되지 않았어요. 설정 > 이메일 템플릿에서 먼저 설정해 주세요.')
  }

  return template
}

export function renderOrderEmailFromTemplate(
  template: Pick<EmailTemplate, 'body' | 'subject'>,
  variables: OrderEmailTemplateVariables,
): { html: string; subject: string; text: string } {
  const rendered = renderTemplate({ subject: template.subject, body: template.body }, variables)

  const subject = rendered.subject.trim()
  if (subject.length === 0) {
    throw new Error('이메일 제목이 비어있어요. 템플릿을 확인해 주세요.')
  }

  const body = rendered.body.trim()
  if (body.length === 0) {
    throw new Error('이메일 본문이 비어있어요. 템플릿을 확인해 주세요.')
  }

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(body)

  if (looksLikeHtml) {
    return { subject, html: body, text: htmlToText(body) }
  }

  return { subject, text: body, html: wrapPlainTextAsHtml(body) }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function wrapPlainTextAsHtml(text: string): string {
  return `<div style="white-space:pre-wrap; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">${escapeHtml(text)}</div>`
}


