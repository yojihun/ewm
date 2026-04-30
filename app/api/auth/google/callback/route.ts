import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { findStudentByEmail } from '@/lib/students'

const ALLOWED_EMAILS = (
  process.env.ALLOWED_TEACHER_EMAILS ||
  'yojihun@e-mirim.hs.kr,yknym@e-mirim.hs.kr,seho0718@e-mirim.hs.kr'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())

const TEACHER_NAMES: Record<string, string> = {
  'yojihun@e-mirim.hs.kr': '김지훈',
  'yknym@e-mirim.hs.kr': '이윤경',
  'seho0718@e-mirim.hs.kr': '이세호',
}

function debug(data: Record<string, unknown>) {
  return new Response(
    `<pre style="font-family:monospace;padding:2rem">${JSON.stringify(data, null, 2)}</pre>`,
    { status: 200, headers: { 'content-type': 'text/html' } }
  )
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const base = origin
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const storedState = req.cookies.get('sf_oauth_state')?.value

  // Parse type from state prefix (e.g. "teacher:uuid" or "student:uuid")
  const authType = storedState?.startsWith('student:') ? 'student' : 'teacher'
  const errorBase = authType === 'student' ? `${base}/` : `${base}/admin`

  if (oauthError || !code) {
    return debug({ step: 'early_exit', oauthError, hasCode: !!code, base })
  }

  if (!storedState || storedState !== state) {
    return debug({ step: 'state_mismatch', storedState: storedState ?? null, state, base })
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${base}/api/auth/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const oauth2Service = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2Service.userinfo.get()
    const email = (data.email ?? '').toLowerCase()

    if (authType === 'student') {
      let student = findStudentByEmail(email)
      if (!student && ALLOWED_EMAILS.includes(email)) {
        // Teachers can log in as students for testing
        student = { studentNumber: 'teacher', name: email.split('@')[0], email }
      }
      if (!student) {
        return debug({ step: 'student_not_found', email, base })
      }

      const res = NextResponse.redirect(`${base}/`)
      res.cookies.set('sf_student', JSON.stringify(student), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8,
      })
      res.cookies.delete('sf_oauth_state')
      return res
    }

    // Teacher flow
    if (!ALLOWED_EMAILS.includes(email)) {
      return debug({ step: 'teacher_not_allowed', email, allowedEmails: ALLOWED_EMAILS, base })
    }

    const res = NextResponse.redirect(`${base}/admin/dashboard`)
    const teacherName = TEACHER_NAMES[email] ?? data.name ?? email.split('@')[0]
    res.cookies.set('sf_session', JSON.stringify({ name: teacherName, email }), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    })
    res.cookies.delete('sf_oauth_state')
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return debug({ step: 'exception', error: message, base })
  }
}
