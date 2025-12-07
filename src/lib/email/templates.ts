import { eq } from 'drizzle-orm'
import Handlebars from 'handlebars'
import 'server-only'

import { db } from '@/db/client'
import { emailTemplate } from '@/db/schema/settings'

export interface EmailTemplate {
  body: string
  createdAt: Date
  enabled: boolean
  id: number
  name: string
  slug: string
  subject: string
  updatedAt: Date
  variables: Record<string, string> | null
}

export type EmailTemplateInput = Omit<EmailTemplate, 'createdAt' | 'id' | 'updatedAt'>

export interface TemplateRenderResult {
  body: string
  subject: string
}

const DEFAULT_ORDER_TEMPLATE: EmailTemplateInput = {
  name: '발주서 기본 템플릿',
  slug: 'order-default',
  subject: '{{manufacturerName}} 발주서 - {{orderDate}}',
  body: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; color: #666; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #333; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 8px 0; vertical-align: top; }
    .info-table td:first-child { width: 120px; color: #666; }
    .footer { border-top: 1px solid #e5e5e5; padding-top: 16px; margin-top: 24px; font-size: 14px; color: #666; }
    .attachment-note { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>발주서</h1>
      <p>{{manufacturerName}}님께</p>
    </div>

    <div class="section">
      <p>안녕하세요, {{senderName}}입니다.</p>
      <p>아래와 같이 발주서를 보내드립니다.</p>
    </div>

    <div class="section">
      <div class="section-title">발주 정보</div>
      <table class="info-table">
        <tr>
          <td>발주일자</td>
          <td>{{orderDate}}</td>
        </tr>
        <tr>
          <td>제조사</td>
          <td>{{manufacturerName}}</td>
        </tr>
        {{#if totalItems}}
        <tr>
          <td>총 품목 수</td>
          <td>{{totalItems}}건</td>
        </tr>
        {{/if}}
        {{#if note}}
        <tr>
          <td>비고</td>
          <td>{{note}}</td>
        </tr>
        {{/if}}
      </table>
    </div>

    <div class="attachment-note">
      📎 첨부파일을 확인해 주세요.
    </div>

    <div class="footer">
      <p>본 메일은 자동 발송되었습니다.<br>문의사항이 있으시면 연락 부탁드립니다.</p>
      <p>{{senderName}}</p>
    </div>
  </div>
</body>
</html>`,
  variables: {
    manufacturerName: '제조사명',
    senderName: '발신자명',
    orderDate: '발주일자',
    totalItems: '총 품목 수',
    note: '비고',
  },
  enabled: true,
}

export const ORDER_TEMPLATE_VARIABLES = {
  manufacturerName: '제조사명',
  senderName: '발신자명',
  orderDate: '발주일자',
  totalItems: '총 품목 수',
  note: '비고',
} as const

export type OrderTemplateVariables = {
  manufacturerName: string
  senderName: string
  orderDate: string
  totalItems?: number
  note?: string
}

export async function createEmailTemplate(input: EmailTemplateInput): Promise<EmailTemplate> {
  const [template] = await db
    .insert(emailTemplate)
    .values({
      name: input.name,
      slug: input.slug,
      subject: input.subject,
      body: input.body,
      variables: input.variables,
      enabled: input.enabled,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    subject: template.subject,
    body: template.body,
    variables: template.variables as Record<string, string> | null,
    enabled: template.enabled ?? true,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

export async function deleteEmailTemplate(id: number): Promise<void> {
  await db.delete(emailTemplate).where(eq(emailTemplate.id, id))
}

export async function ensureDefaultOrderTemplate(): Promise<EmailTemplate> {
  const existing = await getEmailTemplateBySlug('order-default')

  if (existing) {
    return existing
  }

  return createEmailTemplate(DEFAULT_ORDER_TEMPLATE)
}

export async function getEmailTemplateBySlug(slug: string): Promise<EmailTemplate | null> {
  const [template] = await db.select().from(emailTemplate).where(eq(emailTemplate.slug, slug)).limit(1)

  if (!template) {
    return null
  }

  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    subject: template.subject,
    body: template.body,
    variables: template.variables as Record<string, string> | null,
    enabled: template.enabled ?? true,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const templates = await db.select().from(emailTemplate).orderBy(emailTemplate.createdAt)

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    subject: t.subject,
    body: t.body,
    variables: t.variables as Record<string, string> | null,
    enabled: t.enabled ?? true,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))
}

export async function renderOrderEmailTemplate(variables: OrderTemplateVariables): Promise<TemplateRenderResult> {
  const template = await ensureDefaultOrderTemplate()

  return renderTemplate(template, variables)
}

export function renderTemplate(
  template: { subject: string; body: string },
  variables: Record<string, unknown>,
): TemplateRenderResult {
  const subjectTemplate = Handlebars.compile(template.subject)
  const bodyTemplate = Handlebars.compile(template.body)

  return {
    subject: subjectTemplate(variables),
    body: bodyTemplate(variables),
  }
}

export async function updateEmailTemplate(id: number, updates: Partial<EmailTemplateInput>): Promise<EmailTemplate> {
  const [template] = await db.update(emailTemplate).set(updates).where(eq(emailTemplate.id, id)).returning()

  if (!template) {
    throw new Error('템플릿을 찾을 수 없습니다.')
  }

  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    subject: template.subject,
    body: template.body,
    variables: template.variables as Record<string, string> | null,
    enabled: template.enabled ?? true,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}
