import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'sf_session'

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.TEACHER_PASSWORD_HASH
  if (!hash) return false
  return bcrypt.compare(password, hash)
}

function parseSession(value: string | undefined): { name: string; email: string } | null {
  if (!value) return null
  // Legacy cookie value
  if (value === 'admin_authenticated') return { name: 'Teacher', email: '' }
  try {
    const parsed = JSON.parse(value)
    if (parsed?.email) return parsed as { name: string; email: string }
  } catch { /* ignore */ }
  return null
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return parseSession(cookieStore.get(SESSION_COOKIE)?.value) !== null
}

export async function getTeacherInfo(): Promise<{ name: string; email: string } | null> {
  const cookieStore = await cookies()
  return parseSession(cookieStore.get(SESSION_COOKIE)?.value)
}

export async function requireAdmin(): Promise<boolean> {
  return getSession()
}
