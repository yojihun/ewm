import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'sf_session'
const SESSION_SECRET = 'admin_authenticated'

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.TEACHER_PASSWORD_HASH
  if (!hash) return false
  return bcrypt.compare(password, hash)
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  return session?.value === SESSION_SECRET
}

export async function requireAdmin(): Promise<boolean> {
  return getSession()
}
