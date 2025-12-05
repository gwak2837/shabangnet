'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

interface AppleOAuthButtonProps {
  disabled?: boolean
  label?: string
}

export function AppleOAuthButton({ disabled, label = 'Apple로 로그인' }: AppleOAuthButtonProps) {
  const [isPending, setIsPending] = useState(false)

  async function handleAppleLogin() {
    setIsPending(true)

    try {
      await authClient.signIn.social({
        provider: 'apple',
        callbackURL: '/dashboard',
      })
    } catch {
      setIsPending(false)
    }
  }

  return (
    <Button
      className="w-full"
      disabled={disabled || isPending}
      onClick={handleAppleLogin}
      type="button"
      variant="glass-outline"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      )}
      {label}
    </Button>
  )
}
