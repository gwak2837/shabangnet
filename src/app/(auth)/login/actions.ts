'use server'

import { AuthError } from 'next-auth'

import { signIn } from '@/auth'

export async function login(prevState: unknown, formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: '잘못된 인증 요청이에요' }
        default:
          return { error: '문제가 발생했어요' }
      }
    }
    throw error
  }
}
