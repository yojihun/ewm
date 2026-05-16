'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

interface Question {
  id: string
  text: string
  type: 'text' | 'textarea'
}

type TaskGrade = 1 | 2 | 3

interface Task {
  id: string
  title: string
  grade: TaskGrade
  timeLimit: number
  questions: Question[]
  createdBy: string
  createdAt: string
}

const GRADE_OPTIONS: TaskGrade[] = [1, 2, 3]

function gradeLabel(grade: TaskGrade) {
  return `${grade}학년`
}

function Preview({ text }: { text: string }) {
  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">미리보기</p>
      {text.trim() ? (
        <div className="markdown text-sm text-gray-800 leading-relaxed">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-xs text-gray-300 italic">입력하면 미리보기가 표시됩니다.</p>
      )}
    </div>
  )
}

export default function AdminDashboard({ sheetId }: { sheetId: string | null }) {
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [teacherName, setTeacherName] = useState('')
  const [saving, setSaving] = useState(false)
  const [allSaved, setAllSaved] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const allSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Per-task editor state (local until Save is clicked)
  const [title, setTitle] = useState('')
  const [grade, setGrade] = useState<TaskGrade>(1)
  const [timeLimit, setTimeLimit] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [newText, setNewText] = useState('')
  const [newType, setNewType] = useState<'text' | 'textarea'>('textarea')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editType, setEditType] = useState<'text' | 'textarea'>('textarea')

  async function loadTasks() {
    const auth = await fetch('/api/auth/check')
    if (!auth.ok) { router.replace('/admin'); return }
    const { name } = await auth.json()
    if (name) setTeacherName(name)
    const res = await fetch('/api/tasks')
    const data: Task[] = await res.json()
    setTasks(data)
    setLoading(false)
    if (data.length > 0 && !selectedId) selectTask(data[0])
  }

  useEffect(() => { loadTasks() }, [])

  function selectTask(task: Task) {
    setSelectedId(task.id)
    setTitle(task.title)
    setGrade(task.grade ?? 1)
    setTimeLimit(task.timeLimit ?? 0)
    setQuestions(task.questions ?? [])
    setEditingId(null)
    setNewText('')
    setAllSaved(false)
  }

  async function saveAll() {
    if (!selectedId || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, grade, timeLimit, questions }),
      })
      if (res.status === 401) { router.replace('/admin'); return }
      const updated: Task = await res.json()
      setTasks((prev) => prev.map((t) => (t.id === selectedId ? updated : t)))
      setAllSaved(true)
      if (allSavedTimer.current) clearTimeout(allSavedTimer.current)
      allSavedTimer.current = setTimeout(() => setAllSaved(false), 2500)
    } catch (err) {
      alert(`저장 실패: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function createTask() {
    setCreating(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '새 과제', grade: 1, timeLimit: 0, questions: [], createdBy: teacherName }),
      })
      if (res.status === 401) { router.replace('/admin'); return }
      const data = await res.json()
      if (!res.ok) { alert(`과제 생성 실패: ${data.error ?? res.status}`); return }
      const task: Task = data
      setTasks((prev) => [...prev, task])
      selectTask(task)
    } catch (err) {
      alert(`네트워크 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setCreating(false)
    }
  }

  async function duplicateTask(task: Task) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${task.title} 복사본`,
          grade: task.grade ?? 1,
          timeLimit: task.timeLimit ?? 0,
          questions: task.questions ?? [],
          createdBy: teacherName,
        }),
      })
      if (res.status === 401) { router.replace('/admin'); return }
      const data = await res.json()
      if (!res.ok) { alert(`과제 복제 실패: ${data.error ?? res.status}`); return }
      const duplicatedTask: Task = data
      setTasks((prev) => [...prev, duplicatedTask])
      selectTask(duplicatedTask)
    } catch (err) {
      alert(`네트워크 오류: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('이 과제와 모든 질문을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.status === 401) { router.replace('/admin'); return }
    const remaining = tasks.filter((t) => t.id !== id)
    setTasks(remaining)
    if (selectedId === id) {
      if (remaining.length > 0) selectTask(remaining[0])
      else { setSelectedId(null); setTitle(''); setGrade(1); setTimeLimit(0); setQuestions([]); setEditingId(null); setNewText('') }
    }
  }

  function addQuestion() {
    if (!newText.trim()) return
    const newQ: Question = { id: Date.now().toString(), text: newText.trim(), type: newType }
    setQuestions((prev) => [...prev, newQ])
    setNewText('')
  }

  function applyEdit(id: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, text: editText.trim(), type: editType } : q))
    )
    setEditingId(null)
  }

  function deleteQuestion(id: string) {
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

  const selectedTask = tasks.find((t) => t.id === selectedId)

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <span className="text-lg font-black text-indigo-700 tracking-tighter">EWM</span>
          <button
            onClick={logout}
            title="로그아웃"
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            로그아웃
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
            새 과제
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {tasks.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">과제가 없습니다</p>
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
                <p className={`text-sm font-medium truncate pr-12 ${selectedId === task.id ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {task.title}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {gradeLabel(task.grade ?? 1)}
                  {' · '}
                  {(task.questions ?? []).length}개 질문
                  {task.createdBy ? ` · ${task.createdBy}` : ''}
                </p>
                <div className="absolute right-2 top-2.5 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicateTask(task) }}
                    className="rounded p-0.5 text-gray-400 hover:text-indigo-500"
                    title="과제 복제"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M10 20h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}
                    className="rounded p-0.5 text-gray-400 hover:text-red-500"
                    title="과제 삭제"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
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
              구글 시트 열기
            </a>
          </div>
        )}
      </aside>

      {/* Main editor */}
      <main className="flex-1 overflow-y-auto p-6 py-8 min-w-0">
        {!selectedTask ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-400 text-sm">사이드바에서 과제를 선택하거나 새 과제를 만드세요.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-bold text-gray-900">과제 편집</h1>
                <span className="text-xs text-gray-400">
                  생성일 {new Date(selectedTask.createdAt).toLocaleDateString()}
                  {selectedTask.createdBy ? ` · ${selectedTask.createdBy}` : ''}
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <label className="mb-3 block text-sm font-semibold text-gray-700">과제 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예) 3단원 글쓰기"
                className="w-full rounded-lg border border-gray-300 p-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <label className="mb-3 block text-sm font-semibold text-gray-700">학년</label>
              <div className="flex flex-wrap gap-3">
                {GRADE_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                      grade === option
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="grade"
                      value={option}
                      checked={grade === option}
                      onChange={() => setGrade(option)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    {gradeLabel(option)}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">학생 화면에서 학년별 컬럼에 이 과제가 표시됩니다.</p>
            </div>

            {/* Time limit */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <label className="text-sm font-semibold text-gray-700">제한 시간</label>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={timeLimit === 0 ? '' : timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-16 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                  <span className="text-sm text-gray-400">분</span>
                </div>
                {timeLimit > 0 && (
                  <span className="text-sm text-gray-500">학생이 첫 입력 시 타이머 시작</span>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-400">0으로 설정하면 비활성화됩니다. 최대 180분.</p>
            </div>

            {/* Question list */}
            <div className="space-y-3">
              {questions.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 py-10 text-center">
                  <p className="text-sm text-gray-400">질문이 없습니다. 아래에서 추가하세요.</p>
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
                          <option value="textarea">서술형</option>
                          <option value="text">단답형</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">취소</button>
                          <button onClick={() => applyEdit(q.id)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">적용</button>
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
                        <span className="mt-1 text-xs text-gray-400">{q.type === 'textarea' ? '서술형' : '단답형'}</span>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => { setEditingId(q.id); setEditText(q.text); setEditType(q.type) }}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => deleteQuestion(q.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add question */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">질문 추가</h2>
              <div className="space-y-3">
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  rows={3}
                  placeholder="질문을 입력하세요… (**굵게**, *기울임*, - 목록 사용 가능)"
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
                <Preview text={newText} />
                <div className="flex items-center gap-3">
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as 'text' | 'textarea')}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none"
                  >
                    <option value="textarea">서술형</option>
                    <option value="text">단답형</option>
                  </select>
                  <button
                    onClick={addQuestion}
                    disabled={!newText.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    추가
                  </button>
                </div>
              </div>
            </div>

            {/* Save all */}
            <div className="flex items-center justify-end gap-3 py-2">
              {allSaved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  저장되었습니다
                </span>
              )}
              <button
                onClick={saveAll}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                저장
              </button>
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
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700"># 텍스트</code>
                    <span className="text-gray-500 font-bold">질문 제목</span>
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

      {/* Student preview panel — visible only on xl+ screens */}
      <aside className="hidden xl:flex flex-col w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">학생 화면 미리보기</span>
        </div>

        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-xs text-gray-300 text-center">과제를 선택하면<br />미리보기가 표시됩니다</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Task header */}
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-snug">
                {title || <span className="text-gray-300">제목 없음</span>}
              </h2>
              {timeLimit > 0 && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  제한 시간 {timeLimit}분
                </span>
              )}
            </div>

            {/* Questions */}
            {questions.length === 0 ? (
              <p className="text-xs text-gray-300">질문이 없습니다</p>
            ) : (
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={q.id} className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="markdown text-sm text-gray-800 leading-relaxed">
                        <ReactMarkdown>{q.text}</ReactMarkdown>
                      </div>
                    </div>
                    {q.type === 'textarea' ? (
                      <textarea
                        disabled
                        rows={3}
                        placeholder="학생 답변 입력란"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-400 placeholder:text-gray-300 resize-none cursor-default"
                      />
                    ) : (
                      <input
                        disabled
                        type="text"
                        placeholder="학생 답변 입력란"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-400 placeholder:text-gray-300 cursor-default"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
