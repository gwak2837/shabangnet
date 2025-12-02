'use server'

// MFA 관련 액션은 better-auth의 two-factor 및 passkey 플러그인을 통해
// 클라이언트에서 직접 호출됩니다.
//
// - TOTP 설정: authClient.twoFactor.enable()
// - TOTP 검증: authClient.twoFactor.verifyTotp()
// - TOTP 비활성화: authClient.twoFactor.disable()
// - 백업 코드 생성: authClient.twoFactor.generateBackupCodes()
// - 패스키 등록: authClient.passkey.addPasskey()
// - 패스키 삭제: authClient.passkey.deletePasskey()
//
// 서버 액션이 필요한 경우 여기에 추가하세요.

export async function placeholder() {
  // Placeholder to keep the file
    return { success: true }
}
