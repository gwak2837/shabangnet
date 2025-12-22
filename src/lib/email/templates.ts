import { eq } from 'drizzle-orm'
import Handlebars from 'handlebars'
import 'server-only'

import { db } from '@/db/client'
import { emailTemplate } from '@/db/schema/settings'

export interface EmailTemplate {
  body: string
  createdAt: Date
  id: number
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

export async function createEmailTemplate(input: EmailTemplateInput): Promise<EmailTemplate> {
  const [template] = await db
    .insert(emailTemplate)
    .values({
      slug: input.slug,
      subject: input.subject,
      body: input.body,
      variables: input.variables,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return {
    id: template.id,
    slug: template.slug,
    subject: template.subject,
    body: template.body,
    variables: template.variables as Record<string, string> | null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

export async function deleteEmailTemplate(id: number): Promise<void> {
  await db.delete(emailTemplate).where(eq(emailTemplate.id, id))
}

export async function getEmailTemplateById(id: number): Promise<EmailTemplate | null> {
  const [template] = await db
    .select({
      id: emailTemplate.id,
      slug: emailTemplate.slug,
      subject: emailTemplate.subject,
      body: emailTemplate.body,
      variables: emailTemplate.variables,
      createdAt: emailTemplate.createdAt,
      updatedAt: emailTemplate.updatedAt,
    })
    .from(emailTemplate)
    .where(eq(emailTemplate.id, id))

  if (!template) {
    return null
  }

  return {
    id: template.id,
    slug: template.slug,
    subject: template.subject,
    body: template.body,
    variables: template.variables as Record<string, string> | null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

export async function getEmailTemplateBySlug(slug: string): Promise<EmailTemplate | null> {
  const [template] = await db
    .select({
      id: emailTemplate.id,
      slug: emailTemplate.slug,
      subject: emailTemplate.subject,
      body: emailTemplate.body,
      variables: emailTemplate.variables,
      createdAt: emailTemplate.createdAt,
      updatedAt: emailTemplate.updatedAt,
    })
    .from(emailTemplate)
    .where(eq(emailTemplate.slug, slug))

  if (!template) {
    return null
  }

  return {
    id: template.id,
    slug: template.slug,
    subject: template.subject,
    body: template.body,
    variables: template.variables as Record<string, string> | null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const templates = await db
    .select({
      id: emailTemplate.id,
      slug: emailTemplate.slug,
      subject: emailTemplate.subject,
      body: emailTemplate.body,
      variables: emailTemplate.variables,
      createdAt: emailTemplate.createdAt,
      updatedAt: emailTemplate.updatedAt,
    })
    .from(emailTemplate)
    .orderBy(emailTemplate.createdAt)

  return templates.map((t) => ({
    id: t.id,
    slug: t.slug,
    subject: t.subject,
    body: t.body,
    variables: t.variables as Record<string, string> | null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))
}

export function renderTemplate(template: { subject: string; body: string }, variables: object): TemplateRenderResult {
  const subjectTemplate = Handlebars.compile<object>(template.subject)
  const bodyTemplate = Handlebars.compile<object>(template.body)

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
    slug: template.slug,
    subject: template.subject,
    body: template.body,
    variables: template.variables as Record<string, string> | null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}
