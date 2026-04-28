'use client'

interface SecureTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export default function SecureTextarea({
  value,
  onChange,
  placeholder = 'Type your answer here...',
  rows = 6,
}: SecureTextareaProps) {
  const chars = value.length
  const words = countWords(value)

  return (
    <div>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:ring-4 focus:ring-indigo-500/10 transition-all p-5 placeholder:text-slate-400 text-base resize-none outline-none"
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) e.preventDefault()
        }}
        onDrop={(e) => e.preventDefault()}
      />
      <div className="flex justify-between items-center mt-3 px-2">
        <div className="flex gap-4">
          <span className="text-xs text-slate-400">
            <strong className="text-slate-600">{chars}</strong> / 1000 characters
          </span>
          <span className="text-xs text-slate-400">
            <strong className="text-slate-600">{words}</strong> word{words !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="material-symbols-outlined text-slate-300 text-[20px]">spellcheck</span>
      </div>
    </div>
  )
}
