'use client'

import { Eye, FileText, Loader2, Save } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import { toast } from 'sonner'

import { getSampleOrderEmailTemplateVariables, ORDER_EMAIL_TEMPLATE_VARIABLES } from '@/common/constants/order-email-template'
import { queryKeys } from '@/common/constants/query-keys'
import { SettingsIconBadge } from '@/components/settings/settings-icon-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useServerAction } from '@/hooks/use-server-action'

import {
  createOrderEmailTemplateAction,
  previewEmailTemplateAction,
  updateOrderEmailTemplateAction,
} from './action'
import { useEmailTemplate } from './hook'

export function EmailTemplateForm() {
  const { data: template, isLoading } = useEmailTemplate()

  const [isCreating, createTemplate] = useServerAction(createOrderEmailTemplateAction, {
    invalidateKeys: [queryKeys.settings.emailTemplate],
    onSuccess: (result) => {
      if (result.success) {
        toast.success('템플릿이 생성됐어요')
      }
    },
  })

  const [isUpdating, updateTemplate] = useServerAction(updateOrderEmailTemplateAction, {
    invalidateKeys: [queryKeys.settings.emailTemplate],
    onSuccess: (result) => {
      if (result.success) {
        toast.success('템플릿이 저장됐어요')
      }
    },
  })

  const [isPreviewing, previewTemplate] = useServerAction(previewEmailTemplateAction, {
    onSuccess: (result) => {
      if (result.success) {
        setPreviewSubject(result.subject)
        setPreviewHtml(result.body)
      }
    },
  })

  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const isSaving = isCreating || isUpdating

  function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const data = new FormData(e.currentTarget)

    const payload = {
      subject: String(data.get('subject')).trim(),
      body: String(data.get('body')).trim(),
    }

    if (template) {
      updateTemplate({ data: payload })
    } else {
      createTemplate({ data: payload })
    }
  }

  function handlePreview() {
    if (!formRef.current) {
      return
    }

    const data = new FormData(formRef.current)
    const subject = String(data.get('subject')).trim()
    const body = String(data.get('body')).trim()

    previewTemplate({
      template: {
        subject,
        body,
      },
      variables: getSampleOrderEmailTemplateVariables(),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-card p-0 shadow-sm overflow-hidden">
        <header className="px-6 pt-6">
          <div className="flex items-center gap-4">
            <SettingsIconBadge accent="violet" className="h-10 w-10" icon={FileText} />
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">이메일 템플릿</h2>
              <p className="text-sm text-muted-foreground">제조사에게 발송되는 발주서 이메일의 양식을 설정합니다</p>
            </div>
          </div>
        </header>
        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSave} ref={formRef}>
              {!template && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                  아직 템플릿이 없어요. 아래 내용을 입력하고 저장하면 템플릿이 생성돼요.
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" htmlFor="template-subject">
                  이메일 제목
                </Label>
                <Input
                  defaultValue={template?.subject}
                  id="template-subject"
                  name="subject"
                  placeholder="{{manufacturerName}} 발주서 - {{orderDate}}"
                  required
                />
                <p className="text-xs text-muted-foreground">{'{{변수명}}'} 형식으로 동적 값을 삽입할 수 있습니다</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" htmlFor="template-body">
                  이메일 본문 (HTML)
                </Label>
                <textarea
                  className="w-full min-h-[300px] p-3 text-sm font-mono border border-input rounded-lg resize-y bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue={template?.body}
                  id="template-body"
                  name="body"
                  placeholder="HTML 템플릿을 입력하세요..."
                  required
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium mb-2">사용 가능한 변수</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ORDER_EMAIL_TEMPLATE_VARIABLES).map(([key, description]) => (
                    <span
                      className="inline-flex items-center gap-1 text-xs bg-background border border-input rounded px-2 py-1"
                      key={key}
                    >
                      <code className="text-violet-600">{`{{${key}}}`}</code>
                      <span className="text-muted-foreground">- {description}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <Button disabled={isPreviewing || isSaving} onClick={handlePreview} type="button" variant="outline">
                  {isPreviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                  미리보기
                </Button>
                <Button disabled={isSaving || isPreviewing} type="submit">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {template ? '템플릿 저장' : '템플릿 만들기'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
      {previewHtml && (
        <section className="rounded-xl border border-slate-200 bg-card p-0 shadow-sm overflow-hidden">
          <header className="px-6 pt-6">
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">미리보기</h2>
              {previewSubject && (
                <p className="text-sm text-muted-foreground">
                  <strong>제목:</strong> {previewSubject}
                </p>
              )}
            </div>
          </header>
          <div className="p-6">
            <iframe
              className="w-full min-h-[400px] border border-input rounded-lg bg-white"
              sandbox=""
              srcDoc={previewHtml}
              title="이메일 미리보기"
            />
          </div>
        </section>
      )}
    </div>
  )
}
