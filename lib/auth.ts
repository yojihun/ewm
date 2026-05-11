import { cookies } from 'next/headers'

const SESSION_COOKIE = 'sf_session'

export const ALLOWED_TEACHER_EMAILS = (
  process.env.ALLOWED_TEACHER_EMAILS ||
  'yojihun@e-mirim.hs.kr,yknym@e-mirim.hs.kr,seho0718@e-mirim.hs.kr'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())

function parseSession(value: string | undefined): { name: string; email: string } | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (parsed?.email) return parsed as { name: string; email: string }
  } catch { /* ignore */ }
  return null
}

export async function getTeacherInfo(): Promise<{ name: string; email: string } | null> {
  const cookieStore = await cookies()
  const info = parseSession(cookieStore.get(SESSION_COOKIE)?.value)
  if (!info) return null
  if (!ALLOWED_TEACHER_EMAILS.includes(info.email.toLowerCase())) return null
  return info
}

export async function getSession(): Promise<boolean> {
  return (await getTeacherInfo()) !== null
}

export async function requireAdmin(): Promise<boolean> {
  return getSession()
}
