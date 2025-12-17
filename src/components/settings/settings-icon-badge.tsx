'use client'

import type { LucideIcon } from 'lucide-react'

import { cn } from '@/utils/cn'

const settingsAccentStyles = {
  blue: 'bg-blue-600/10 text-blue-600 ring-blue-600/15',
  indigo: 'bg-indigo-600/10 text-indigo-600 ring-indigo-600/15',
  violet: 'bg-violet-600/10 text-violet-600 ring-violet-600/15',
  emerald: 'bg-emerald-600/10 text-emerald-600 ring-emerald-600/15',
  amber: 'bg-amber-600/10 text-amber-600 ring-amber-600/15',
  rose: 'bg-rose-600/10 text-rose-600 ring-rose-600/15',
} as const

export type SettingsAccent = keyof typeof settingsAccentStyles

interface SettingsIconBadgeProps {
  accent: SettingsAccent
  className?: string
  icon: LucideIcon
  iconClassName?: string
}

export function SettingsIconBadge({ accent, icon: Icon, className, iconClassName }: SettingsIconBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg ring-1 ring-inset',
        settingsAccentStyles[accent],
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn('h-5 w-5', iconClassName)} />
    </div>
  )
}
