import { NextResponse } from 'next/server'
import { getTeacherInfo } from '@/lib/auth'

export async function GET() {
  const teacher = await getTeacherInfo()
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ ok: true, name: teacher.name })
}
