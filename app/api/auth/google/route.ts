import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

function baseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') === 'student' ? 'student' : 'teacher'
  const errorRedirect = type === 'student' ? `${baseUrl()}/?error=oauth_not_configured` : `${baseUrl()}/admin?error=oauth_not_configured`

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(errorRedirect)
  }

  // Encode auth type in state so callback knows which flow to complete
  const state = `${type}:${crypto.randomUUID()}`
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl()}/api/auth/google/callback`
  )

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
    hd: 'e-mirim.hs.kr',
  })

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('sf_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  })
  return res
}
