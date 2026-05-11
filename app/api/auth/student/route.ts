import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyCookie } from '@/lib/auth'
import type { Student } from '@/lib/students'

export async function GET() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('sf_student')?.value
  if (!raw) return NextResponse.json({ student: null })

  const student = await verifyCookie<Student>(raw)
  return NextResponse.json({ student: student ?? null })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('sf_student')
  return res
}
