import { NextRequest, NextResponse } from 'next/server'
import { appendRow } from '@/lib/sheets'
import { readConfig } from '@/lib/questions'
import { sendSubmissionEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, studentNumber, email, answers, tabSwitchCount, copyCount, pasteCount } = body as {
    name: string
    studentNumber: string
    email: string
    answers: Record<string, string>
    tabSwitchCount: number
    copyCount: number
    pasteCount: number
  }

  if (!name || !studentNumber) {
    return NextResponse.json({ error: 'Name and student number required' }, { status: 400 })
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

  const config = await readConfig()
  const answerValues = config.questions.map((q) => answers[q.id] ?? '')

  const row = [
    new Date().toISOString(),
    name,
    studentNumber,
    email ?? '',
    String(tabSwitchCount ?? 0),
    String(copyCount ?? 0),
    String(pasteCount ?? 0),
    ...answerValues,
  ]

  try {
    await appendRow(config.title, row)
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
        quizTitle: config.title,
        questions: config.questions,
        answers,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[submit] Email error:', message)
      return NextResponse.json({ ok: true, emailError: message })
    }
  }

  return NextResponse.json({ ok: true })
}
