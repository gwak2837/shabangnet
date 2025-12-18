'use client'

import type { MouseEvent } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableHead } from '@/components/ui/table'
import { cn } from '@/utils/cn'

const ROW_SELECT_IGNORE_SELECTOR = [
  '[data-row-select-ignore]',
  'a',
  'button',
  'input',
  'select',
  'summary',
  'textarea',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
].join(',')

type CheckedState = boolean | 'indeterminate'

interface TableSelectionCellProps {
  'aria-label': string
  checked: boolean
  className?: string
  hitAreaClassName?: string
  onCheckedChange?: (checked: boolean) => void
}

interface TableSelectionHeadCellProps {
  'aria-label': string
  checked: CheckedState
  className?: string
  hitAreaClassName?: string
  onCheckedChange?: (checked: boolean) => void
}

export function shouldToggleRowSelection(event: MouseEvent<HTMLElement>): boolean {
  if (event.defaultPrevented) {
    return false
  }

  // Only respond to primary button clicks (left click / tap).
  if (event.button !== 0) {
    return false
  }

  const target = event.target
  if (target instanceof Element && target.closest(ROW_SELECT_IGNORE_SELECTOR)) {
    return false
  }

  // If the user is selecting text (dragging to copy), don't toggle selection.
  if (typeof window !== 'undefined') {
    const selection = window.getSelection?.()
    if (selection && selection.type === 'Range' && selection.toString().trim().length > 0) {
      return false
    }
  }

  return true
}

export function TableSelectionCell({ className, onCheckedChange, ...props }: TableSelectionCellProps) {
  const { hitAreaClassName, ...checkboxProps } = props

  return (
    <TableCell className={cn('w-12 p-0', className)}>
      <div
        className={cn('mx-auto w-fit', hitAreaClassName)}
        data-row-select-ignore
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox {...checkboxProps} onCheckedChange={(checked) => onCheckedChange?.(checked === true)} />
      </div>
    </TableCell>
  )
}

export function TableSelectionHeadCell({ className, onCheckedChange, ...props }: TableSelectionHeadCellProps) {
  const { hitAreaClassName, ...checkboxProps } = props

  return (
    <TableHead className={cn('w-12 px-0', className)}>
      <div
        className={cn('mx-auto w-fit', hitAreaClassName)}
        data-row-select-ignore
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox {...checkboxProps} onCheckedChange={(checked) => onCheckedChange?.(checked === true)} />
      </div>
    </TableHead>
  )
}
