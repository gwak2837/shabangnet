'use client'

import { cn } from '@/utils/cn'
import { calculateStrength, getStrengthLabel, type PasswordStrength } from '@/utils/password'

interface PasswordStrengthIndicatorProps {
  errorMessage?: string
  password: string
}

const strengthConfig: Record<PasswordStrength, { color: string; glow: string; width: string }> = {
  weak: {
    color: 'bg-rose-400 dark:bg-rose-500',
    glow: 'shadow-[0_0_8px_rgba(251,113,133,0.4)]',
    width: 'w-[33%]',
  },
  medium: {
    color: 'bg-amber-400 dark:bg-amber-500',
    glow: 'shadow-[0_0_8px_rgba(251,191,36,0.4)]',
    width: 'w-[66%]',
  },
  strong: {
    color: 'bg-emerald-400 dark:bg-emerald-500',
    glow: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]',
    width: 'w-full',
  },
}

const strengthTextColor: Record<PasswordStrength, string> = {
  weak: 'text-rose-500 dark:text-rose-400',
  medium: 'text-amber-600 dark:text-amber-400',
  strong: 'text-emerald-600 dark:text-emerald-400',
}

export function PasswordStrengthIndicator({ password, errorMessage }: PasswordStrengthIndicatorProps) {
  const strength = calculateStrength(password)
  const strengthLabel = getStrengthLabel(strength)
  const config = strengthConfig[strength]

  if (!password) {
    return null
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
            비밀번호 강도
          </span>
          <span
            className={cn(
              'text-xs font-semibold tracking-tight transition-colors duration-500',
              strengthTextColor[strength],
            )}
          >
            {strengthLabel}
          </span>
        </div>
        <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out',
              config.color,
              config.width,
              strength === 'strong' && config.glow,
            )}
            style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
        </div>
      </div>
      {errorMessage && <p className="text-[13px] text-rose-500 dark:text-rose-400">{errorMessage}</p>}
    </div>
  )
}
