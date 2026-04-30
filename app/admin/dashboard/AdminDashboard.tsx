'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

interface Question {
  id: string
  text: string
  type: 'text' | 'textarea'
}

interface Task {
  id: string
  title: string
  timeLimit: number
  questions: Question[]
  createdBy: string
  createdAt: string
}

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

function SavedBadge({ show }: { show: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Saved
    </span>
  )
}

export default function AdminDashboard({ sheetId }: { sheetId: string | null }) {
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Per-task editor state
  const [title, setTitle] = useState('')
  const [timeLimit, setTimeLimit] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [newText, setNewText] = useState('')
  const [newType, setNewType] = useState<'text' | 'textarea'>('textarea')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editType, setEditType] = useState<'text' | 'textarea'>('textarea')

  // Flash badges
  const [titleSaved, setTitleSaved] = useState(false)
  const [timeLimitSaved, setTimeLimitSaved] = useState(false)
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null)
  const [addedFlash, setAddedFlash] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const questionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function flash(setter: (v: boolean) => void, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
    setter(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setter(false), 2000)
  }

  async function loadTasks() {
    const auth = await fetch('/api/auth/check')
    if (!auth.ok) { router.replace('/admin'); return }
    const res = await fetch('/api/tasks')
    const data: Task[] = await res.json()
    setTasks(data)
    setLoading(false)
    // Auto-select first task
    if (data.length > 0 && !selectedId) {
      selectTask(data[0])
    }
  }

  useEffect(() => { loadTasks() }, [])

  function selectTask(task: Task) {
    setSelectedId(task.id)
    setTitle(task.title)
    setTimeLimit(task.timeLimit ?? 0)
    setQuestions(task.questions ?? [])
    setEditingId(null)
    setNewText('')
  }

  async function createTask() {
    setCreating(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Task', timeLimit: 0, questions: [], createdBy: '' }),
      })
      if (res.status === 401) { router.replace('/admin'); return }
      const data = await res.json()
      if (!res.ok) { alert(`Failed to create task: ${data.error ?? res.status}`); return }
      const task: Task = data
      setTasks((prev) => [...prev, task])
      selectTask(task)
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setCreating(false)
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task and all its questions?')) return
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.status === 401) { router.replace('/admin'); return }
    const remaining = tasks.filter((t) => t.id !== id)
    setTasks(remaining)
    if (selectedId === id) {
      if (remaining.length > 0) selectTask(remaining[0])
      else { setSelectedId(null); setTitle(''); setTimeLimit(0); setQuestions([]); setEditingId(null); setNewText('') }
    }
  }

  // Save title for selected task
  async function saveTitle() {
    if (!selectedId) return
    const res = await fetch(`/api/tasks/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.status === 401) { router.replace('/admin'); return }
    const updated: Task = await res.json()
    setTasks((prev) => prev.map((t) => (t.id === selectedId ? updated : t)))
    flash(setTitleSaved, titleTimer)
  }

  async function saveTimeLimit() {
    if (!selectedId) return
    const res = await fetch(`/api/tasks/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeLimit }),
    })
    if (res.status === 401) { router.replace('/admin'); return }
    flash(setTimeLimitSaved, timeLimitTimer)
  }

  // Save full questions array for selected task
  async function saveQuestions(qs: Question[]) {
    if (!selectedId) return
    const res = await fetch(`/api/tasks/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: qs }),
    })
    if (res.status === 401) { router.replace('/admin'); return }
    const updated: Task = await res.json()
    setTasks((prev) => prev.map((t) => (t.id === selectedId ? updated : t)))
    return updated
  }

  async function addQuestion() {
    if (!newText.trim() || !selectedId) return
    const newQ: Question = {
      id: Date.now().toString(),
      text: newText.trim(),
      type: newType,
    }
    const updated = [...questions, newQ]
    setQuestions(updated)
    setNewText('')
    setAddedFlash(true)
    setTimeout(() => setAddedFlash(false), 2000)
    await saveQuestions(updated)
  }

  async function saveEdit(id: string) {
    const updated = questions.map((q) =>
      q.id === id ? { ...q, text: editText.trim(), type: editType } : q
    )
    setQuestions(updated)
    setEditingId(null)
    await saveQuestions(updated)
    setSavedQuestionId(id)
    if (questionTimer.current) clearTimeout(questionTimer.current)
    questionTimer.current = setTimeout(() => setSavedQuestionId(null), 2000)
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return
    const updated = questions.filter((q) => q.id !== id)
    setQuestions(updated)
    await saveQuestions(updated)
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

  const selectedTask = tasks.find((t) => t.id === selectedId)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <span className="text-lg font-black text-indigo-700 tracking-tighter">EWM</span>
          <button
            onClick={logout}
            title="Logout"
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Logout
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={createTask}
            disabled={creating}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {tasks.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No tasks yet</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`group relative rounded-xl px-3 py-3 cursor-pointer transition ${
                  selectedId === task.id
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => selectTask(task)}
              >
                <p className={`text-sm font-medium truncate pr-6 ${selectedId === task.id ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {task.title}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {(task.questions ?? []).length} question{(task.questions ?? []).length !== 1 ? 's' : ''}
                  {task.createdBy ? ` · ${task.createdBy}` : ''}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}
                  className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition rounded p-0.5 text-gray-400 hover:text-red-500"
                  title="Delete task"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </nav>

        {sheetId && (
          <div className="p-3 border-t border-gray-200">
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 transition"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Google Sheet
            </a>
          </div>
        )}
      </aside>

      {/* Main editor */}
      <main className="flex-1 overflow-y-auto p-6 py-8">
        {!selectedTask ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Select a task from the sidebar or create a new one.</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <h1 className="text-lg font-bold text-gray-900">Task Editor</h1>
              <span className="text-xs text-gray-400">
                Created {new Date(selectedTask.createdAt).toLocaleDateString()}
                {selectedTask.createdBy ? ` by ${selectedTask.createdBy}` : ''}
              </span>
            </div>

            {/* Title */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Task Title</label>
                <SavedBadge show={titleSaved} />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  onBlur={saveTitle}
                  placeholder="e.g. Chapter 3 Writing"
                  className="flex-1 rounded-lg border border-gray-300 p-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  onClick={saveTitle}
                  className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900"
                >
                  저장
                </button>
              </div>
            </div>

            {/* Time limit */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
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
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    onBlur={saveTimeLimit}
                    placeholder="0"
                    className="w-16 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                  <span className="text-sm text-gray-400">min</span>
                </div>
                <button
                  onClick={saveTimeLimit}
                  className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900"
                >
                  저장
                </button>
                {timeLimit > 0 && (
                  <span className="text-sm text-gray-500">학생이 첫 입력 시 타이머 시작</span>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-400">Set to 0 to disable. Max 180 minutes.</p>
            </div>

            {/* Question list */}
            <div className="space-y-3">
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
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                          <button onClick={() => saveEdit(q.id)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">Save</button>
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

            {/* Markdown tips */}
            <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setTipsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-600">마크다운 도움말</span>
                </div>
                <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${tipsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {tipsOpen && (
                <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3">
                  <p className="text-xs text-gray-400">질문 텍스트에 마크다운 문법을 사용할 수 있습니다.</p>
                  <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-2 text-xs items-center">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">**텍스트**</code>
                    <span className="text-gray-500 font-semibold">굵게</span>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">*텍스트*</code>
                    <span className="text-gray-500 italic">기울임</span>

                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">- 항목</code>
                    <span className="text-gray-500">글머리 기호 목록</span>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">1. 항목</code>
                    <span className="text-gray-500">번호 목록</span>

                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">`코드`</code>
                    <span className="text-gray-500 font-mono text-[11px]">인라인 코드</span>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">&gt; 텍스트</code>
                    <span className="text-gray-500">인용구</span>
                  </div>
                  <p className="text-xs text-gray-400 pt-1">문단 사이에는 빈 줄을 넣으세요. Enter를 두 번 눌러 새 문단을 시작합니다.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
