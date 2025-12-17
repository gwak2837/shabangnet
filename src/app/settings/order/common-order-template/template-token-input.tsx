'use client'

import { useRef, useState } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/utils/cn'

export interface TemplateTokenOption {
  label: string
  token: string
}

interface TemplateTokenInputProps {
  className?: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
  tokens: TemplateTokenOption[]
  value: string
}

export function TemplateTokenInput({
  value,
  onChange,
  tokens,
  placeholder,
  rows = 2,
  className,
}: TemplateTokenInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [selectKey, setSelectKey] = useState(0)

  function insertToken(token: string) {
    const el = textareaRef.current
    const insertion = `{{${token}}}`

    if (!el) {
      onChange(`${value}${insertion}`)
      return
    }

    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`
    onChange(next)

    requestAnimationFrame(() => {
      el.focus()
      const caret = start + insertion.length
      el.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      <textarea
        className={cn(
          'min-h-10 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[box-shadow,border-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
        )}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        ref={textareaRef}
        rows={rows}
        value={value}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          key={selectKey}
          onValueChange={(v) => {
            insertToken(v)
            setSelectKey((prev) => prev + 1)
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="토큰 삽입" />
          </SelectTrigger>
          <SelectContent>
            {tokens.map((t) => (
              <SelectItem key={t.token} value={t.token}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-muted-foreground">
          없으면 <code className="rounded bg-muted px-1 py-0.5">{'||'}</code> 로 대체값을 쓸 수 있어요. 예:{' '}
          <code className="rounded bg-muted px-1 py-0.5">{'{{주문인 || 받는인}}'}</code>
        </p>
      </div>
    </div>
  )
}
