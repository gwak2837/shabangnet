'use client'

import { Pencil, Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { type ShoppingMallTemplate } from '@/services/shopping-mall-templates'

interface TemplateItemProps {
  isDeleting?: boolean
  onDelete?: () => void
  onEdit?: () => void
  onToggle?: () => void
  skeleton?: boolean
  template: ShoppingMallTemplate
}

export function TemplateItem({ template, skeleton, isDeleting, onToggle, onEdit, onDelete }: TemplateItemProps) {
  const columnKeys = Object.keys(template.columnMappings)
  const switchId = `template-${template.id}`

  return (
    <div
      aria-busy={skeleton}
      className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 py-3 transition aria-busy:animate-pulse aria-busy:cursor-not-allowed aria-busy:text-muted-foreground data-disabled:opacity-50"
      data-disabled={!skeleton && !template.enabled ? '' : undefined}
    >
      <Switch checked={template.enabled} id={switchId} onCheckedChange={onToggle} />
      <label className="grid gap-1.5 min-w-0 flex-1 cursor-pointer" htmlFor={switchId}>
        <div className="flex items-center gap-3">
          <span className="truncate text-base font-medium text-foreground">{template.displayName}</span>
          <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
            {template.mallName}
          </span>
        </div>
        {columnKeys.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {columnKeys.slice(0, 4).map((col, i) => (
              <span
                className="inline-flex items-center rounded bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-border/50"
                key={skeleton ? i : col}
              >
                {col}
              </span>
            ))}
            {columnKeys.length > 4 && <span className="text-xs text-muted-foreground">+{columnKeys.length - 4}개</span>}
          </div>
        )}
      </label>
      <div className="flex items-center gap-0.5">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onEdit}
          type="button"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              aria-disabled={isDeleting}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive aria-disabled:opacity-50"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>쇼핑몰 템플릿 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                정말 &ldquo;{template.displayName}&rdquo; 템플릿을 삭제하시겠습니까?
                <br />이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={onDelete}>
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
