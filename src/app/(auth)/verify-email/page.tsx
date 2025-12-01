import { verifyEmailToken } from './actions'

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token: string }> }) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">잘못된 요청</h1>
        <p className="mt-2 text-gray-600">인증 토큰이 없습니다.</p>
      </div>
    )
  }

  const result = await verifyEmailToken(token)

  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <h1 className="text-2xl font-bold">이메일 인증</h1>
      {result.error ? (
        <div className="rounded-md bg-red-50 p-4 text-red-700">
          <p>{result.error}</p>
        </div>
      ) : (
        <div className="rounded-md bg-green-50 p-4 text-green-700">
          <p>{result.success}</p>
          <p className="text-sm mt-2">계정이 인증되었습니다.</p>
        </div>
      )}
      <a
        className="mt-4 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        href="/login"
      >
        로그인으로 이동
      </a>
    </div>
  )
}
