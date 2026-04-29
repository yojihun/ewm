'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: '이 계정은 접근 권한이 없습니다. (Account not authorised)',
  oauth_cancelled: '로그인이 취소되었습니다. (Sign-in cancelled)',
  invalid_state: '보안 오류가 발생했습니다. 다시 시도해주세요. (Security error — please try again)',
  auth_failed: '인증에 실패했습니다. 다시 시도해주세요. (Authentication failed — please try again)',
  oauth_not_configured: 'Google 로그인이 설정되지 않았습니다. (Google login not configured)',
}

function AdminLoginContent() {
  const params = useSearchParams()
  const error = params.get('error')
  const email = params.get('email')

  const errorMsg = error ? (ERROR_MESSAGES[error] ?? '알 수 없는 오류가 발생했습니다.') : null
  const notAllowedDetail = error === 'not_allowed' && email ? ` (${email})` : ''

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md border border-slate-100">
        <div className="mb-6 text-center">
          <span className="text-2xl font-black text-indigo-700 tracking-tighter">PME</span>
          <h1 className="mt-3 text-xl font-bold text-gray-800">Teacher Login</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in with your school Google account.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}{notAllowedDetail}
          </div>
        )}

        <a
          href="/api/auth/google"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </a>

        <p className="mt-5 text-center text-xs text-slate-400">
          Only authorised school accounts can access this page.
        </p>
      </div>
    </div>
  )
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  )
}
