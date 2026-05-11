import { cookies } from 'next/headers'

const SESSION_COOKIE = 'sf_session'
const encoder = new TextEncoder()

export const ALLOWED_TEACHER_EMAILS = (
  process.env.ALLOWED_TEACHER_EMAILS ||
  'yojihun@e-mirim.hs.kr,yknym@e-mirim.hs.kr,seho0718@e-mirim.hs.kr'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())

async function getHmacKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET ?? 'ewm-dev-fallback-set-SESSION_SECRET-in-vercel'
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signCookie(payload: object): Promise<string> {
  const key = await getHmacKey()
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = Buffer.from(
    await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  ).toString('base64url')
  return `${data}.${sig}`
}

export async function verifyCookie<T>(value: string): Promise<T | null> {
  if (!value) return null
  const dot = value.lastIndexOf('.')
  if (dot === -1) return null
  const data = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  try {
    const key = await getHmacKey()
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      Buffer.from(sig, 'base64url'),
      encoder.encode(data)
    )
    if (!valid) return null
    return JSON.parse(Buffer.from(data, 'base64url').toString()) as T
  } catch {
    return null
  }
}

export async function getTeacherInfo(): Promise<{ name: string; email: string } | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return null
  const info = await verifyCookie<{ name: string; email: string }>(raw)
  if (!info?.email) return null
  if (!ALLOWED_TEACHER_EMAILS.includes(info.email.toLowerCase())) return null
  return info
}

export async function getSession(): Promise<boolean> {
  return (await getTeacherInfo()) !== null
}

export async function requireAdmin(): Promise<boolean> {
  return getSession()
}
