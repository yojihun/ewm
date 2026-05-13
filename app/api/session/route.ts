import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyCookie } from '@/lib/auth'

interface SessionEntry {
  token: string
  lastSeen: number
}

// In-memory map: studentNumber → { token, lastSeen }
// Resets on server restart, which is acceptable for per-exam use
const activeSessions = new Map<string, SessionEntry>()

// A session with no heartbeat for this long is considered stale (abrupt close)
const STALE_MS = 60_000

async function verifyStudentCookie(studentNumber: string): Promise<boolean> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('sf_student')?.value
  if (!raw) return false
  const session = await verifyCookie<{ studentNumber: string }>(raw)
  return session?.studentNumber === studentNumber
}

export async function POST(req: NextRequest) {
  const { studentNumber, sessionToken } = (await req.json()) as {
    studentNumber: string
    sessionToken: string
  }
  if (!studentNumber || !sessionToken) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!(await verifyStudentCookie(studentNumber))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const now = Date.now()
  const existing = activeSessions.get(studentNumber)
  const duplicate =
    existing !== undefined &&
    existing.token !== sessionToken &&
    now - existing.lastSeen < STALE_MS

  if (!duplicate) {
    activeSessions.set(studentNumber, { token: sessionToken, lastSeen: now })
  }
  return NextResponse.json({ ok: true, duplicate })
}

// Heartbeat — keeps the current session alive so stale detection works correctly
export async function PATCH(req: NextRequest) {
  const { studentNumber, sessionToken } = (await req.json()) as {
    studentNumber: string
    sessionToken: string
  }
  if (!(await verifyStudentCookie(studentNumber))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const existing = activeSessions.get(studentNumber)
  if (existing && existing.token === sessionToken) {
    activeSessions.set(studentNumber, { token: sessionToken, lastSeen: Date.now() })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { studentNumber, sessionToken } = (await req.json()) as {
    studentNumber: string
    sessionToken: string
  }
  if (!(await verifyStudentCookie(studentNumber))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (activeSessions.get(studentNumber)?.token === sessionToken) {
    activeSessions.delete(studentNumber)
  }
  return NextResponse.json({ ok: true })
}
