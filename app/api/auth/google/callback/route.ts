import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { findStudentByEmail } from '@/lib/students'

const ALLOWED_EMAILS = (
  process.env.ALLOWED_TEACHER_EMAILS ||
  'yojihun@e-mirim.hs.kr,yknym@e-mirim.hs.kr,seho0718@e-mirim.hs.kr'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())

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
    return NextResponse.redirect(`${errorBase}?error=oauth_cancelled`)
  }

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${errorBase}?error=invalid_state`)
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
      const student = findStudentByEmail(email)
      if (!student) {
        return NextResponse.redirect(
          `${base}/?error=not_allowed&email=${encodeURIComponent(email)}`
        )
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
      return NextResponse.redirect(
        `${base}/admin?error=not_allowed&email=${encodeURIComponent(email)}`
      )
    }

    const res = NextResponse.redirect(`${base}/admin/dashboard`)
    res.cookies.set('sf_session', 'admin_authenticated', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    })
    res.cookies.delete('sf_oauth_state')
    return res
  } catch (err) {
    console.error('[google/callback]', err)
    return NextResponse.redirect(`${errorBase}?error=auth_failed`)
  }
}
