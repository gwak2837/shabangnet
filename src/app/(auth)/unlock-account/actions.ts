'use server'

// Account lock 기능은 better-auth에서는 기본적으로 제공되지 않습니다.
// 필요한 경우 별도 구현이 필요합니다.

interface UnlockResult {
  error?: string
  success?: string
}

export async function unlockAccountAction(token: string): Promise<UnlockResult> {
  if (!token) {
    return { error: '잠금 해제 토큰이 필요해요' }
  }

  // TODO: Account lock 기능 구현 필요
  return { error: '계정 잠금 해제 기능이 아직 구현되지 않았어요' }
}
