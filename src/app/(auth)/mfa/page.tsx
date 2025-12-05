import { MfaChallenge } from './mfa-challenge'

export default function MfaPage() {
  return (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">본인 확인</h2>
        <p className="mt-2 text-sm text-muted-foreground">안전한 로그인을 위해 인증을 완료해주세요</p>
      </div>
      <MfaChallenge />
    </>
  )
}
