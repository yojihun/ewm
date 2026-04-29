import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const ALLOWED_EMAILS = (
  process.env.ALLOWED_TEACHER_EMAILS ||
  'yojihun@e-mirim.hs.kr,yknym@e-mirim.hs.kr,seho0718@e-mirim.hs.kr'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())

function baseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')
  const base = baseUrl()

  if (oauthError || !code) {
    return NextResponse.redirect(`${base}/admin?error=oauth_cancelled`)
  }

  const storedState = req.cookies.get('sf_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${base}/admin?error=invalid_state`)
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

    if (!ALLOWED_EMAILS.includes(email)) {
      return NextResponse.redirect(`${base}/admin?error=not_allowed&email=${encodeURIComponent(email)}`)
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
    return NextResponse.redirect(`${base}/admin?error=auth_failed`)
  }
}
