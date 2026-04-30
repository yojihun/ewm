import { NextRequest, NextResponse } from 'next/server'
import { appendRow } from '@/lib/sheets'
import { getTask } from '@/lib/tasks'
import { sendSubmissionEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    taskId,
    name,
    studentNumber,
    email,
    answers,
    tabSwitchCount,
    copyCount,
    pasteCount,
    refreshCount,
    windowBlurCount,
    spotlightCount,
    duplicateSession,
  } = body as {
    taskId: string
    name: string
    studentNumber: string
    email: string
    answers: Record<string, string>
    tabSwitchCount: number
    copyCount: number
    pasteCount: number
    refreshCount: number
    windowBlurCount: number
    spotlightCount: number
    duplicateSession: boolean
  }

  if (!name || !studentNumber) {
    return NextResponse.json({ error: 'Name and student number required' }, { status: 400 })
  }

  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  const sheetsConfigured =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID

  if (!sheetsConfigured) {
    return NextResponse.json(
      { error: 'Google Sheets is not configured. Fill in GOOGLE_* values in .env.local.' },
      { status: 503 }
    )
  }

  const task = await getTask(taskId)
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const answerValues = task.questions.map((q) => answers[q.id] ?? '')

  const header = [
    '제출 시각', '이름', '학번', '이메일',
    '탭 전환', '복사', '붙여넣기', '새로고침', '창 전환', '스포트라이트', '중복 세션',
    ...task.questions.map((q, i) => `Q${i + 1}. ${q.text.replace(/[*`#>_~]/g, '').slice(0, 60)}`),
  ]

  const row = [
    new Date().toISOString(),
    name,
    studentNumber,
    email ?? '',
    String(tabSwitchCount ?? 0),
    String(copyCount ?? 0),
    String(pasteCount ?? 0),
    String(refreshCount ?? 0),
    String(windowBlurCount ?? 0),
    String(spotlightCount ?? 0),
    duplicateSession ? 'YES' : 'NO',
    ...answerValues,
  ]

  try {
    await appendRow(task.title, header, row)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[submit] Google Sheets error:', message)
    return NextResponse.json({ error: `Failed to write to Google Sheets: ${message}` }, { status: 500 })
  }

  if (email && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      await sendSubmissionEmail({
        to: email,
        studentName: name,
        studentNumber,
        quizTitle: task.title,
        questions: task.questions,
        answers,
        securityCounts: {
          tabSwitchCount: tabSwitchCount ?? 0,
          copyCount: copyCount ?? 0,
          pasteCount: pasteCount ?? 0,
          refreshCount: refreshCount ?? 0,
          windowBlurCount: windowBlurCount ?? 0,
          spotlightCount: spotlightCount ?? 0,
          duplicateSession: duplicateSession ?? false,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[submit] Email error:', message)
      return NextResponse.json({ ok: true, emailError: message })
    }
  }

  return NextResponse.json({ ok: true })
}
