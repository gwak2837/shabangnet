'use client'

import { cn } from '@/utils/cn'
import {
  calculateStrength,
  getStrengthLabel,
  PASSWORD_ERROR_MESSAGES,
  type PasswordStrength,
  type PasswordValidationResult,
} from '@/utils/password'

interface PasswordStrengthIndicatorProps {
  password: string
  showChecklist?: boolean
  validation?: PasswordValidationResult
}

interface RequirementItemProps {
  isValid: boolean
  isWarning?: boolean
  label: string
}

type RequirementState = 'invalid' | 'valid' | 'warning'

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

const textColors: Record<RequirementState, string> = {
  invalid: 'text-muted-foreground/60',
  valid: 'text-foreground/80',
  warning: 'text-rose-500/90 dark:text-rose-400/90',
}

const dotStyles: Record<RequirementState, string> = {
  invalid: 'scale-75 bg-muted-foreground/30',
  valid: 'scale-100 bg-emerald-500 dark:bg-emerald-400',
  warning: 'scale-100 bg-rose-400 dark:bg-rose-500',
}

export function PasswordStrengthIndicator({
  password,
  showChecklist = true,
  validation,
}: PasswordStrengthIndicatorProps) {
  const strength = calculateStrength(password)
  const strengthLabel = getStrengthLabel(strength)
  const config = strengthConfig[strength]

  if (!password) {
    return null
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-2">
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
      {showChecklist && validation && (
        <ul className="space-y-2.5 pt-1">
          <RequirementItem isValid={!validation.errors.minLength} label={PASSWORD_ERROR_MESSAGES.minLength} />
          <RequirementItem isValid={!validation.errors.hasLetter} label={PASSWORD_ERROR_MESSAGES.hasLetter} />
          <RequirementItem isValid={!validation.errors.hasNumber} label={PASSWORD_ERROR_MESSAGES.hasNumber} />
          <RequirementItem isValid={!validation.errors.hasSpecial} label={PASSWORD_ERROR_MESSAGES.hasSpecial} />
          {validation.errors.isCommon && (
            <RequirementItem isValid={false} isWarning label={PASSWORD_ERROR_MESSAGES.isCommon} />
          )}
        </ul>
      )}
    </div>
  )
}

function getRequirementState(isValid: boolean, isWarning?: boolean): RequirementState {
  if (isValid) return 'valid'
  if (isWarning) return 'warning'
  return 'invalid'
}

function RequirementItem({ isValid, isWarning, label }: RequirementItemProps) {
  const state = getRequirementState(isValid, isWarning)

  return (
    <li
      className={cn(
        'flex items-center gap-2.5 text-[13px] leading-none transition-all duration-300',
        textColors[state],
      )}
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        <span className={cn('absolute h-1.5 w-1.5 rounded-full transition-all duration-300', dotStyles[state])} />
        <span
          className={cn(
            'absolute h-3 w-3 rounded-full border transition-all duration-500',
            isValid ? 'scale-100 border-emerald-500/30 dark:border-emerald-400/30' : 'scale-0 border-transparent',
          )}
        />
      </span>
      <span className={cn('transition-all duration-300', isValid && 'translate-x-0.5')}>{label}</span>
    </li>
  )
}
