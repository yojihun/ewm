import { NextRequest, NextResponse } from 'next/server'

interface SessionEntry {
  token: string
  lastSeen: number
}

// In-memory map: studentNumber → { token, lastSeen }
// Resets on server restart, which is acceptable for per-exam use
const activeSessions = new Map<string, SessionEntry>()

// A session with no heartbeat for this long is considered stale (abrupt close)
const STALE_MS = 60_000

export async function POST(req: NextRequest) {
  const { studentNumber, sessionToken } = (await req.json()) as {
    studentNumber: string
    sessionToken: string
  }
  if (!studentNumber || !sessionToken) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const now = Date.now()
  const existing = activeSessions.get(studentNumber)
  const duplicate =
    existing !== undefined &&
    existing.token !== sessionToken &&
    now - existing.lastSeen < STALE_MS

  activeSessions.set(studentNumber, { token: sessionToken, lastSeen: now })
  return NextResponse.json({ ok: true, duplicate })
}

// Heartbeat — keeps the current session alive so stale detection works correctly
export async function PATCH(req: NextRequest) {
  const { studentNumber, sessionToken } = (await req.json()) as {
    studentNumber: string
    sessionToken: string
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
  if (activeSessions.get(studentNumber)?.token === sessionToken) {
    activeSessions.delete(studentNumber)
  }
  return NextResponse.json({ ok: true })
}
