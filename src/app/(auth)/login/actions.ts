'use server'

import { AuthError, CredentialsSignin } from 'next-auth'

import { signIn } from '@/auth'

export async function login(_prevState: unknown, formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      if (error instanceof CredentialsSignin) {
        switch (error.code) {
          case 'account_locked':
            return {
              error: '계정이 잠겼어요. 이메일을 확인하여 잠금을 해제해주세요.',
              code: 'account_locked',
            }
          case 'too_many_attempts':
            return {
              error: '로그인 시도가 너무 많아 계정이 잠겼어요. 이메일로 전송된 링크를 확인해주세요.',
              code: 'too_many_attempts',
            }
          default:
            return { error: '이메일 또는 비밀번호가 올바르지 않아요' }
        }
      }
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: '이메일 또는 비밀번호가 올바르지 않아요' }
        default:
          return { error: '문제가 발생했어요' }
      }
    }
    throw error
  }
}
