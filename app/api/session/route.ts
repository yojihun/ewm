import { NextRequest, NextResponse } from 'next/server'

// In-memory map: studentNumber → sessionToken
// Resets on server restart, which is acceptable for per-exam use
const activeSessions = new Map<string, string>()

export async function POST(req: NextRequest) {
  const { studentNumber, sessionToken } = (await req.json()) as {
    studentNumber: string
    sessionToken: string
  }
  if (!studentNumber || !sessionToken) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const existing = activeSessions.get(studentNumber)
  const duplicate = existing !== undefined && existing !== sessionToken
  activeSessions.set(studentNumber, sessionToken)
  return NextResponse.json({ ok: true, duplicate })
}

export async function DELETE(req: NextRequest) {
  const { studentNumber, sessionToken } = (await req.json()) as {
    studentNumber: string
    sessionToken: string
  }
  if (activeSessions.get(studentNumber) === sessionToken) {
    activeSessions.delete(studentNumber)
  }
  return NextResponse.json({ ok: true })
}
