import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const ok = await getSession()
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ ok: true })
}
