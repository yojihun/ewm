'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import SecureTextarea from '@/components/SecureTextarea'

interface Question {
  id: string
  text: string
  type: 'text' | 'textarea'
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function FormContent() {
  const router = useRouter()
  const params = useSearchParams()
  const name = params.get('name') ?? ''
  const studentNumber = params.get('studentNumber') ?? ''
  const email = params.get('email') ?? ''

  const [title, setTitle] = useState('Quiz')
  const [timeLimitSecs, setTimeLimitSecs] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [timeLeft, setTimeLeft] = useState(0)
  const [timerStarted, setTimerStarted] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const [copyCount, setCopyCount] = useState(0)
  const [showCopyWarning, setShowCopyWarning] = useState(false)
  const [pasteCount, setPasteCount] = useState(0)
  const [showPasteWarning, setShowPasteWarning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const answersRef = useRef<Record<string, string>>({})
  const questionsRef = useRef<Question[]>([])
  const submittingRef = useRef(false)
  const tabSwitchRef = useRef(0)
  const copyRef = useRef(0)
  const pasteRef = useRef(0)

  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { questionsRef.current = questions }, [questions])

  useEffect(() => {
    function handleSwitch() {
      if (submittingRef.current) return
      tabSwitchRef.current += 1
      setTabSwitchCount(tabSwitchRef.current)
      setShowTabWarning(true)
    }
    document.addEventListener('visibilitychange', handleSwitch)
    window.addEventListener('blur', handleSwitch)
    return () => {
      document.removeEventListener('visibilitychange', handleSwitch)
      window.removeEventListener('blur', handleSwitch)
    }
  }, [])

  useEffect(() => {
    // DOM copy/cut events fire for Ctrl+C, Cmd+C, right-click Copy, and Edit menu Copy.
    // Using these instead of keydown avoids double-counting and catches right-click too.
    function handleCopy() {
      if (submittingRef.current) return
      copyRef.current += 1
      setCopyCount(copyRef.current)
      setShowCopyWarning(true)
    }
    function handlePaste(e: Event) {
      if (submittingRef.current) return
      e.preventDefault()
      pasteRef.current += 1
      setPasteCount(pasteRef.current)
      setShowPasteWarning(true)
    }
    // Ctrl+A / Cmd+A (select all) has no DOM event — keydown only.
    function handleSelectAll(e: KeyboardEvent) {
      if (submittingRef.current) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        copyRef.current += 1
        setCopyCount(copyRef.current)
        setShowCopyWarning(true)
      }
    }
    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('keydown', handleSelectAll)
    return () => {
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('keydown', handleSelectAll)
    }
  }, [])

  useEffect(() => {
    if (!name || !studentNumber || !email) {
      router.replace('/')
      return
    }
    fetch('/api/questions')
      .then((r) => r.json())
      .then((data: { title: string; timeLimit: number; questions: Question[] }) => {
        setTitle(data.title)
        const secs = (data.timeLimit ?? 0) * 60
        setTimeLimitSecs(secs)
        setTimeLeft(secs)
        setQuestions(data.questions)
        const initial: Record<string, string> = {}
        data.questions.forEach((q) => (initial[q.id] = ''))
        setAnswers(initial)
        answersRef.current = initial
        questionsRef.current = data.questions
      })
      .finally(() => setLoading(false))
  }, [name, studentNumber, router])

  const doSubmit = useCallback(async (isAutoSubmit = false) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    if (intervalRef.current) clearInterval(intervalRef.current)

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        studentNumber,
        email,
        answers: answersRef.current,
        tabSwitchCount: tabSwitchRef.current,
        copyCount: copyRef.current,
        pasteCount: pasteRef.current,
      }),
    })

    setSubmitting(false)
    if (res.ok) {
      if (isAutoSubmit) setTimedOut(true)
      setSubmitted(true)
    } else {
      submittingRef.current = false
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Submission failed. Please try again.')
    }
  }, [name, studentNumber])

  useEffect(() => {
    if (!timerStarted || timeLimitSecs === 0) return
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          doSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerStarted, timeLimitSecs, doSubmit])

  function startTimerOnFirstInput() {
    if (!timerStarted && timeLimitSecs > 0) setTimerStarted(true)
  }

  function handleAnswerChange(id: string, value: string) {
    startTimerOnFirstInput()
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const unanswered = questions.filter((q) => !answers[q.id]?.trim())
    if (unanswered.length > 0) {
      setError('Please answer all questions before submitting.')
      return
    }
    setError('')
    await doSubmit(false)
  }

  const urgent = timerStarted && timeLeft <= 60
  const veryUrgent = timerStarted && timeLeft <= 30
  const timerClasses = veryUrgent
    ? 'bg-error-container text-on-error-container border-red-200'
    : urgent
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-surface-container-high text-on-surface border-outline-variant'

  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant">Loading questions…</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-100">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-on-surface">
            {timedOut ? "Time's Up!" : 'Submitted!'}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {timedOut
              ? 'Your answers were automatically submitted when time ran out.'
              : 'Your answers have been recorded.'}
          </p>
          <p className="mt-2 text-sm font-medium text-on-surface">Thank you, {name}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6">
        <span className="text-xl font-black text-indigo-700 tracking-tighter">PME</span>

        {/* Progress – center */}
        {questions.length > 0 && (
          <div className="hidden md:flex flex-col items-center flex-1 max-w-md px-8">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
              {answeredCount} / {questions.length} answered
            </span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Student
            </span>
            <span className="text-sm font-semibold text-on-surface">{name}</span>
          </div>
          {timeLimitSecs > 0 && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors duration-500 ${timerClasses}`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${veryUrgent ? 'animate-pulse' : ''}`}
              >
                timer
              </span>
              <span className="font-mono text-lg font-semibold tabular-nums tracking-tight">
                {timerStarted ? formatTime(timeLeft) : formatTime(timeLimitSecs)}
              </span>
              {!timerStarted && (
                <span className="text-[10px] font-medium opacity-60 hidden lg:inline">
                  starts on first keystroke
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16 pb-10 px-4 md:px-12 lg:px-24">
        <div className="max-w-[720px] mx-auto space-y-6 py-8">

          {/* Security warning */}
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4 shadow-sm">
            <span
              className="material-symbols-outlined text-amber-600 mt-0.5 shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">
                Security Warning: Anti-Cheat Protocol
              </h4>
              <p className="text-amber-800/80 text-sm mt-1 leading-relaxed">
                Copy-pasting and tab-switching are strictly prohibited. These actions are logged
                and will trigger an automatic security review of your submission.
                <br />
                클립보드를 이용한 붙여넣기 또는 다른 애플리케이션으로 이동하여 내용을 참고하는
                것은 부정행위로 처리됩니다.
              </p>
            </div>
          </section>

          {/* Tab switch warning */}
          {showTabWarning && (
            <section className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start justify-between gap-4 shadow-sm">
              <div className="flex gap-4">
                <span
                  className="material-symbols-outlined text-red-500 mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
                <p className="text-sm text-red-700 font-medium">
                  화면 이탈이 감지되었습니다 — Window switch detected ({tabSwitchCount}회).{' '}
                  이 기록은 제출 시 선생님께 전달됩니다.
                </p>
              </div>
              <button
                onClick={() => setShowTabWarning(false)}
                className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </section>
          )}

          {/* Copy/cut warning */}
          {showCopyWarning && (
            <section className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start justify-between gap-4 shadow-sm">
              <div className="flex gap-4">
                <span
                  className="material-symbols-outlined text-red-500 mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  content_copy
                </span>
                <p className="text-sm text-red-700 font-medium">
                  복사가 감지되었습니다 — Copy / Select-all detected ({copyCount}회).{' '}
                  이 기록은 제출 시 선생님께 전달됩니다.
                </p>
              </div>
              <button
                onClick={() => setShowCopyWarning(false)}
                className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </section>
          )}

          {/* Paste warning */}
          {showPasteWarning && (
            <section className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start justify-between gap-4 shadow-sm">
              <div className="flex gap-4">
                <span
                  className="material-symbols-outlined text-red-500 mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  content_paste_off
                </span>
                <p className="text-sm text-red-700 font-medium">
                  붙여넣기가 차단되었습니다 — Paste blocked ({pasteCount}회).{' '}
                  이 기록은 제출 시 선생님께 전달됩니다.
                </p>
              </div>
              <button
                onClick={() => setShowPasteWarning(false)}
                className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </section>
          )}

          {/* Title card */}
          <div className="bg-white border border-slate-200 rounded-xl px-8 py-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-on-surface">{title}</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {name} · {studentNumber}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((q, i) => (
              <article
                key={q.id}
                className="bg-white border border-slate-200 rounded-xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
              >
                <header className="flex items-center gap-3 mb-6">
                  <span className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {q.type === 'textarea' ? 'Short Answer' : 'Text'}
                  </span>
                </header>

                <div className="markdown text-xl font-semibold text-on-surface leading-snug mb-6">
                  <ReactMarkdown>{q.text}</ReactMarkdown>
                </div>

                {q.type === 'textarea' ? (
                  <SecureTextarea
                    value={answers[q.id] ?? ''}
                    onChange={(v) => handleAnswerChange(q.id, v)}
                  />
                ) : (
                  <div>
                    <input
                      type="text"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      onPaste={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V'))
                          e.preventDefault()
                      }}
                      onDrop={(e) => e.preventDefault()}
                      placeholder="Type your answer here..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:ring-4 focus:ring-indigo-500/10 transition-all p-5 placeholder:text-slate-400 text-base outline-none"
                    />
                    <div className="flex justify-end gap-4 mt-3 px-2">
                      <span className="text-xs text-slate-400">
                        <strong className="text-slate-600">
                          {countWords(answers[q.id] ?? '')}
                        </strong>{' '}
                        words
                      </span>
                      <span className="text-xs text-slate-400">
                        <strong className="text-slate-600">
                          {(answers[q.id] ?? '').length}
                        </strong>{' '}
                        chars
                      </span>
                    </div>
                  </div>
                )}
              </article>
            ))}

            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                <span className="material-symbols-outlined text-red-500 text-[20px] shrink-0">
                  error
                </span>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end items-center py-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-10 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-primary-container transition-all active:scale-95 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit Answers
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default function FormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <FormContent />
    </Suspense>
  )
}
