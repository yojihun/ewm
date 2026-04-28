'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !studentNumber.trim() || !email.trim()) {
      setError('Please fill in all fields.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    const params = new URLSearchParams({ name: name.trim(), studentNumber: studentNumber.trim(), email: email.trim() })
    router.push(`/form?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background security-bg flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm flex justify-between items-center w-full px-6 h-16">
        <h1 className="text-xl font-black text-indigo-700 tracking-tighter">PME</h1>
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full">
          <span
            className="material-symbols-outlined text-[18px] text-on-surface-variant"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock
          </span>
          <span className="text-xs text-on-surface-variant font-medium">Encrypted Session</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-[520px] bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-100 p-8 sm:p-10 relative overflow-hidden">
          {/* Accent line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />

          {/* Branding */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container text-white mb-6 shadow-lg shadow-indigo-100">
              <span
                className="material-symbols-outlined text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                menu_book
              </span>
            </div>
            <h2 className="text-[30px] leading-[1.2] font-semibold tracking-tight text-on-surface mb-1">
              Practical Media English
            </h2>
            <p className="text-sm text-on-surface-variant tracking-wide uppercase font-medium">
              English for IT · SW · Design
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-on-surface-variant block ml-1"
                htmlFor="full-name"
              >
                Full Name 이름
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <input
                  id="full-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예시) 김지훈"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-lg text-base text-on-surface placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Student number */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-on-surface-variant block ml-1"
                htmlFor="student-id"
              >
                Student Number 학번
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <input
                  id="student-id"
                  type="text"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="예시) 3703"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-lg text-base text-on-surface placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-on-surface-variant block ml-1"
                htmlFor="email"
              >
                Email 이메일
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="예시) kim@school.kr"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-lg text-base text-on-surface placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container border border-error/20">
                {error}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_circle
                </span>
                Start Quiz
              </button>
            </div>

          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-8 text-center">
        <div className="w-16 h-px bg-outline-variant mx-auto mb-6" />
        <p className="text-xs text-on-surface-variant tracking-widest uppercase font-medium">
          Practical Media English &nbsp;·&nbsp; 2026
        </p>
      </footer>

      {/* Background blobs */}
      <div className="fixed top-20 -left-20 w-80 h-80 bg-indigo-50/50 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 -right-20 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl -z-10" />
    </div>
  )
}
