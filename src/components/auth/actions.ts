'use server'

import { signIn } from '@/auth'

export async function signInWithProvider(provider: 'google' | 'kakao' | 'naver') {
  await signIn(provider, { redirectTo: '/dashboard' })
}
