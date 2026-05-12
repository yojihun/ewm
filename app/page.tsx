'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Student {
  studentNumber: string
  name: string
  email: string
}

interface Task {
  id: string
  title: string
  timeLimit: number
  createdBy: string
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchTasksWithRetry() {
  let lastStatus = 0
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch('/api/tasks')
    lastStatus = res.status
    if (res.status === 401) return { unauthorized: true, tasks: [] as Task[] }
    if (res.ok) {
      const data = await res.json()
      return { unauthorized: false, tasks: Array.isArray(data) ? data as Task[] : [] }
    }
    if (attempt < 2) await delay(500 * (attempt + 1))
  }
  throw new Error(`Task request failed (${lastStatus})`)
}

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: '이 계정은 등록된 학생 계정이 아닙니다. (Account not in student roster)',
  oauth_cancelled: '로그인이 취소되었습니다. (Sign-in cancelled)',
  invalid_state: '보안 오류가 발생했습니다. 다시 시도해주세요. (Security error — please try again)',
  auth_failed: '인증에 실패했습니다. 다시 시도해주세요. (Authentication failed — please try again)',
  oauth_not_configured: 'Google 로그인이 설정되지 않았습니다. (Google login not configured)',
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function HomeContent() {
  const router = useRouter()
  const params = useSearchParams()
  const errorKey = params.get('error')
  const errorEmail = params.get('email')

  const [student, setStudent] = useState<Student | null | undefined>(undefined)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [taskError, setTaskError] = useState('')

  const errorMsg = errorKey ? (ERROR_MESSAGES[errorKey] ?? '알 수 없는 오류가 발생했습니다.') : null
  const errorDetail = errorKey === 'not_allowed' && errorEmail ? ` (${errorEmail})` : ''

  useEffect(() => {
    fetch('/api/auth/student')
      .then((r) => r.json())
      .then((data: { student: Student | null }) => setStudent(data.student))
      .catch(() => setStudent(null))
  }, [])

  useEffect(() => {
    if (!student) return
    let cancelled = false

    async function loadTasks() {
      setLoadingTasks(true)
      setTaskError('')
      try {
        const data = await fetchTasksWithRetry()
        if (cancelled) return
        if (data.unauthorized) {
          setStudent(null)
          setTasks([])
          return
        }
        setTasks(data.tasks)
      } catch {
        if (cancelled) return
        setTasks([])
        setTaskError('과제를 불러오지 못했습니다. 잠시 후 새로고침해주세요. (Could not load tasks. Please refresh in a moment.)')
      } finally {
        if (!cancelled) setLoadingTasks(false)
      }
    }

    loadTasks()
    return () => {
      cancelled = true
    }
  }, [student])

  async function handleLogout() {
    await fetch('/api/auth/student', { method: 'DELETE' })
    setStudent(null)
    setTasks([])
  }

  // Still determining session
  if (student === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  // Not logged in — show login UI
  if (!student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md border border-slate-100">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 mb-4">
              <span className="material-symbols-outlined text-[28px] text-indigo-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                menu_book
              </span>
            </div>
            <span className="block text-2xl font-black text-indigo-700 tracking-tighter">EWM</span>
            <h1 className="mt-2 text-xl font-bold text-gray-800">English Writing in Mirim</h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in with your school Google account to begin.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}{errorDetail}
            </div>
          )}

          <a
            href="/api/auth/google?type=student"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <GoogleIcon />
            Sign in with Google
          </a>

          <p className="mt-5 text-center text-xs text-slate-400">
            Use your <strong>@e-mirim.hs.kr</strong> school account.
          </p>
        </div>
      </div>
    )
  }

  // Logged in — show task list
  return (
    <div className="min-h-screen bg-background security-bg flex flex-col overflow-x-hidden">
      <header className="bg-white border-b border-slate-200 shadow-sm flex justify-between items-center w-full px-6 h-16">
        <span className="text-xl font-black text-indigo-700 tracking-tighter">EWM</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:block">
            {student.name} <span className="text-slate-400">· {student.studentNumber}</span>
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Logout
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center p-6">
        <div className="w-full max-w-lg mt-8">
          <h2 className="text-2xl font-bold text-on-surface mb-1">
            안녕하세요, {student.name}!
          </h2>
          <p className="text-sm text-on-surface-variant mb-8">
            Select a writing task to begin your assessment.
          </p>

          {loadingTasks ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : taskError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              {taskError}
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
              <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-3">
                assignment
              </span>
              <p className="text-sm text-slate-400">No tasks available yet.</p>
              <p className="text-xs text-slate-300 mt-1">Check back later or ask your teacher.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => router.push(`/form?taskId=${task.id}`)}
                  className="w-full text-left rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-6 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-on-surface group-hover:text-indigo-700 transition-colors">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        {task.timeLimit > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <span className="material-symbols-outlined text-[14px]">timer</span>
                            {task.timeLimit} min
                          </span>
                        )}
                        {task.createdBy && (
                          <span className="text-xs text-slate-400">by {task.createdBy}</span>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0 mt-1">
                      arrow_forward
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="w-full px-6 py-6 text-center">
        <p className="text-xs text-on-surface-variant tracking-widest uppercase font-medium">
          English Writing in Mirim &nbsp;·&nbsp; 2026
        </p>
      </footer>

      <div className="fixed top-20 -left-20 w-80 h-80 bg-indigo-50/50 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 -right-20 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl -z-10" />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
