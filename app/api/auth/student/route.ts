import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { Student } from '@/lib/students'

export async function GET() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('sf_student')?.value
  if (!raw) return NextResponse.json({ student: null })

  try {
    const student: Student = JSON.parse(raw)
    return NextResponse.json({ student })
  } catch {
    return NextResponse.json({ student: null })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('sf_student')
  return res
}
