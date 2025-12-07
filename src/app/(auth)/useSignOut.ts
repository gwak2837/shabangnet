import { useQueryClient } from '@tanstack/react-query'
import { useTransition } from 'react'

import { signOut } from './action'

export function useSignOut() {
  const [isSigningOut, startTransition] = useTransition()
  const queryClient = useQueryClient()

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
      queryClient.clear()
      window.location.href = '/login'
    })
  }

  return { signOut: handleSignOut, isSigningOut }
}
