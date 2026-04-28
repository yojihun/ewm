'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

function Preview({ text }: { text: string }) {
  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Preview</p>
      {text.trim() ? (
        <div className="markdown text-sm text-gray-800 leading-relaxed">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-xs text-gray-300 italic">Nothing to preview yet…</p>
      )}
    </div>
  )
}

interface Question {
  id: string
  text: string
  type: 'text' | 'textarea'
}

function SavedBadge({ show }: { show: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
      }`}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Saved
    </span>
  )
}

export default function AdminDashboard({ sheetId }: { sheetId: string | null }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [timeLimit, setTimeLimit] = useState(0)
  const [timeLimitSaved, setTimeLimitSaved] = useState(false)
  const timeLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [newType, setNewType] = useState<'text' | 'textarea'>('textarea')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editType, setEditType] = useState<'text' | 'textarea'>('textarea')

  const [titleSaved, setTitleSaved] = useState(false)
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null)
  const [addedFlash, setAddedFlash] = useState(false)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const questionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function flashTitle() {
    setTitleSaved(true)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => setTitleSaved(false), 2000)
  }

  function flashQuestion(id: string) {
    setSavedQuestionId(id)
    if (questionTimer.current) clearTimeout(questionTimer.current)
    questionTimer.current = setTimeout(() => setSavedQuestionId(null), 2000)
  }

  async function loadQuestions() {
    const auth = await fetch('/api/auth/check')
    if (!auth.ok) { router.replace('/admin'); return }
    const res = await fetch('/api/questions')
    const data = await res.json()
    setTitle(data.title ?? 'Quiz')
    setTimeLimit(data.timeLimit ?? 0)
    setQuestions(data.questions ?? [])
    setLoading(false)
  }

  useEffect(() => { loadQuestions() }, [])

  async function saveTitle() {
    const res = await fetch('/api/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.status === 401) { router.replace('/admin'); return }
    flashTitle()
  }

  async function saveTimeLimit() {
    const res = await fetch('/api/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeLimit }),
    })
    if (res.status === 401) { router.replace('/admin'); return }
    setTimeLimitSaved(true)
    if (timeLimitTimer.current) clearTimeout(timeLimitTimer.current)
    timeLimitTimer.current = setTimeout(() => setTimeLimitSaved(false), 2000)
  }

  async function addQuestion() {
    if (!newText.trim()) return
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText.trim(), type: newType }),
    })
    if (res.status === 401) { router.replace('/admin'); return }
    const q = await res.json()
    setQuestions((prev) => [...prev, q])
    setNewText('')
    setAddedFlash(true)
    setTimeout(() => setAddedFlash(false), 2000)
  }

  async function saveEdit(id: string) {
    const res = await fetch('/api/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, text: editText.trim(), type: editType }),
    })
    if (res.status === 401) { router.replace('/admin'); return }
    const updated = await res.json()
    setQuestions((prev) => prev.map((q) => (q.id === id ? updated : q)))
    setEditingId(null)
    flashQuestion(id)
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return
    const res = await fetch('/api/questions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.status === 401) { router.replace('/admin'); return }
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-10">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Question Manager</h1>
            <p className="text-xs text-gray-400 mt-0.5">Changes save to Google Sheets</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Logout
          </button>
        </div>

        {/* Test title */}
        <div className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">Test Title</label>
            <SavedBadge show={titleSaved} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              placeholder="e.g. Chapter 3 Quiz"
              className="flex-1 rounded-lg border border-gray-300 p-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={saveTitle}
              className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900"
            >
              Save
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">This title is shown to students at the top of the quiz.</p>
        </div>

        {/* Time limit */}
        <div className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <label className="text-sm font-semibold text-gray-700">Time Limit</label>
            </div>
            <SavedBadge show={timeLimitSaved} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
              <input
                type="number"
                min={0}
                max={180}
                value={timeLimit === 0 ? '' : timeLimit}
                onChange={(e) => setTimeLimit(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                onKeyDown={(e) => e.key === 'Enter' && saveTimeLimit()}
                placeholder="0"
                className="w-16 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              <span className="text-sm text-gray-400">min</span>
            </div>
            <button
              onClick={saveTimeLimit}
              className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900"
            >
              Save
            </button>
            {timeLimit > 0 && (
              <span className="text-sm text-gray-500">
                Timer starts on student's first keystroke
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">Set to 0 to disable. Max 180 minutes.</p>
        </div>

        {/* Sheet link */}
        {sheetId && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3" />
              </svg>
              <span className="text-sm font-medium text-green-700">Student responses</span>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-green-600 underline underline-offset-2"
            >
              Open Google Sheet →
            </a>
          </div>
        )}

        {/* Question list */}
        <div className="mb-4 space-y-3">
          {questions.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-10 text-center">
              <p className="text-sm text-gray-400">No questions yet. Add one below.</p>
            </div>
          )}
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl bg-white shadow-sm overflow-hidden">
              {editingId === q.id ? (
                <div className="p-5 space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    autoFocus
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                  <Preview text={editText} />
                  <div className="flex items-center justify-between">
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as 'text' | 'textarea')}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none"
                    >
                      <option value="textarea">Long answer</option>
                      <option value="text">Short answer</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(q.id)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="markdown text-sm font-medium text-gray-900">
                      <ReactMarkdown>{q.text}</ReactMarkdown>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-400">{q.type === 'textarea' ? 'Long answer' : 'Short answer'}</span>
                      <SavedBadge show={savedQuestionId === q.id} />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => { setEditingId(q.id); setEditText(q.text); setEditType(q.type) }}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add question */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Add Question</h2>
            {addedFlash && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Question added
              </span>
            )}
          </div>
          <div className="space-y-3">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={3}
              placeholder="Enter question text… (supports **bold**, *italic*, - lists)"
              className="w-full rounded-lg border border-gray-300 p-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
            <Preview text={newText} />
            <div className="flex items-center gap-3">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'text' | 'textarea')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none"
              >
                <option value="textarea">Long answer</option>
                <option value="text">Short answer</option>
              </select>
              <button
                onClick={addQuestion}
                disabled={!newText.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
