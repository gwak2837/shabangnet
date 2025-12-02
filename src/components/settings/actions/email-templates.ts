'use server'

import type { EmailTemplate, EmailTemplateInput } from '@/lib/email/templates'

import {
  createEmailTemplate,
  deleteEmailTemplate,
  ensureDefaultOrderTemplate,
  getEmailTemplateBySlug,
  getEmailTemplates,
  renderTemplate,
  updateEmailTemplate,
} from '@/lib/email/templates'

// ============================================================================
// Types
// ============================================================================

export interface EmailTemplateDisplay {
  body: string
  createdAt: string
  enabled: boolean
  id: string
  name: string
  slug: string
  subject: string
  updatedAt: string
  variables: Record<string, string> | null
}

export interface EmailTemplateFormData {
  body: string
  enabled: boolean
  name: string
  slug: string
  subject: string
  variables: Record<string, string>
}

interface ActionResult {
  error?: string
  message?: string
  success: boolean
}

interface GetTemplateResult {
  error?: string
  success: boolean
  template: EmailTemplateDisplay | null
}

interface GetTemplatesResult {
  error?: string
  success: boolean
  templates: EmailTemplateDisplay[]
}

interface PreviewResult {
  body: string
  error?: string
  subject: string
  success: boolean
}

// ============================================================================
// Template Actions
// ============================================================================

/**
 * 이메일 템플릿을 생성합니다.
 */
export async function createEmailTemplateAction(data: EmailTemplateFormData): Promise<ActionResult> {
  try {
    await createEmailTemplate({
      name: data.name,
      slug: data.slug,
      subject: data.subject,
      body: data.body,
      variables: data.variables,
      enabled: data.enabled,
    })

    return {
      success: true,
      message: '템플릿이 생성되었습니다.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '템플릿 생성 중 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * 이메일 템플릿을 삭제합니다.
 */
export async function deleteEmailTemplateAction(id: string): Promise<ActionResult> {
  try {
    await deleteEmailTemplate(id)

    return {
      success: true,
      message: '템플릿이 삭제되었습니다.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '템플릿 삭제 중 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * 기본 발주서 템플릿을 생성하거나 조회합니다.
 */
export async function ensureDefaultOrderTemplateAction(): Promise<GetTemplateResult> {
  try {
    const template = await ensureDefaultOrderTemplate()

    return {
      success: true,
      template: templateToDisplay(template),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '기본 템플릿 생성 중 오류가 발생했습니다.'
    return { success: false, template: null, error: errorMessage }
  }
}

/**
 * 슬러그로 이메일 템플릿을 조회합니다.
 */
export async function getEmailTemplateBySlugAction(slug: string): Promise<GetTemplateResult> {
  try {
    const template = await getEmailTemplateBySlug(slug)

    return {
      success: true,
      template: template ? templateToDisplay(template) : null,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '템플릿을 불러오는 중 오류가 발생했습니다.'
    return { success: false, template: null, error: errorMessage }
  }
}

/**
 * 이메일 템플릿 목록을 조회합니다.
 */
export async function getEmailTemplatesAction(): Promise<GetTemplatesResult> {
  try {
    const templates = await getEmailTemplates()

    return {
      success: true,
      templates: templates.map(templateToDisplay),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '템플릿을 불러오는 중 오류가 발생했습니다.'
    return { success: false, templates: [], error: errorMessage }
  }
}

/**
 * 템플릿을 미리보기합니다.
 */
export async function previewEmailTemplateAction(
  template: { subject: string; body: string },
  variables: Record<string, unknown>,
): Promise<PreviewResult> {
  try {
    const result = renderTemplate(template, variables)

    return {
      success: true,
      subject: result.subject,
      body: result.body,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '미리보기 생성 중 오류가 발생했습니다.'
    return { success: false, subject: '', body: '', error: errorMessage }
  }
}

/**
 * 이메일 템플릿을 업데이트합니다.
 */
export async function updateEmailTemplateAction(
  id: string,
  data: Partial<EmailTemplateFormData>,
): Promise<ActionResult> {
  try {
    await updateEmailTemplate(id, data as Partial<EmailTemplateInput>)

    return {
      success: true,
      message: '템플릿이 업데이트되었습니다.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '템플릿 업데이트 중 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function templateToDisplay(template: EmailTemplate): EmailTemplateDisplay {
  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    subject: template.subject,
    body: template.body,
    variables: template.variables,
    enabled: template.enabled,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }
}
