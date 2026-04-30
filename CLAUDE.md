@AGENTS.md

# SecureForm — Project Knowledge

## Stack
- Next.js **16.2.4** (App Router), React 19, TypeScript, Tailwind CSS v4
- Google Sheets as the database (via `googleapis`)
- Google OAuth 2.0 for both teacher and student login
- Deployed on **Vercel** at `https://ewm-livid.vercel.app`

---

## Critical Next.js 16 gotchas

### Route params are a Promise
In App Router route handlers and pages, `params` is `Promise<{ id: string }>` — must be awaited:
```ts
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

### `NEXT_PUBLIC_*` vars are baked at build time
Next.js webpack inlines `NEXT_PUBLIC_*` values at **build time**. Setting them in Vercel after a deploy has **no effect** — the old value is already baked into the bundle, even for API routes.

**Solution:** Derive the base URL from the incoming request instead of an env var:
```ts
const base = new URL(req.url).origin
```
This is the pattern used in `/api/auth/google/route.ts` and `/api/auth/google/callback/route.ts`.

### Static prerendering crashes pages that use cookies/env at runtime
By default, Next.js tries to statically prerender pages at build time. Any page that reads cookies or calls APIs at runtime must opt out:
```ts
export const dynamic = 'force-dynamic'
```
Without this, the page is cached as a static resource and shows "This page couldn't load" when visited.
Applied to: `app/admin/dashboard/page.tsx`.

---

## Authentication

### Teacher login
- Route: `/admin` → Google OAuth (`/api/auth/google?type=teacher`) → `/api/auth/google/callback`
- Allowed emails defined in `ALLOWED_TEACHER_EMAILS` env var (or hardcoded fallback in callback route)
- Success sets `sf_session=admin_authenticated` cookie (httpOnly, SameSite=lax, 8h)
- Checked by `requireAdmin()` in `lib/auth.ts`

### Student login
- Route: `/` → Google OAuth (`/api/auth/google?type=student`) → `/api/auth/google/callback`
- OAuth is restricted to `@e-mirim.hs.kr` via `hd: 'e-mirim.hs.kr'` in the auth URL
- Email looked up in `lib/students.ts` roster via `findStudentByEmail(email)`
- **Teacher accounts can also log in as students** (for testing) — if a teacher email isn't in the student roster but is in `ALLOWED_EMAILS`, a synthetic student record is created with `studentNumber: 'teacher'`
- Success sets `sf_student=<JSON>` cookie with `{ studentNumber, name, email }` (httpOnly, SameSite=lax, 8h)

### OAuth state
State cookie `sf_oauth_state` encodes the auth type: `"teacher:<uuid>"` or `"student:<uuid>"`.
The callback reads `storedState.startsWith('student:')` to decide which flow to complete.

### Debug mode in callback
Error paths in `/api/auth/google/callback/route.ts` use a `debug()` helper that returns a visible JSON/HTML page instead of silently redirecting. This makes OAuth errors diagnosable. Success paths still redirect normally.

---

## Google Sheets data layer

### Service account
- Email: `secureform@itproposaltest.iam.gserviceaccount.com`
- Credentials file: `itproposaltest-6ef7e9959f95.json` (do not commit)
- The service account must have **Editor** (not Viewer) access on the Google Sheet — Viewer access causes "The caller does not have permission" when creating new tabs

### Tasks storage
Tasks are stored as a JSON array in cell `A1` of the `_tasks` tab in Google Sheets.
`lib/tasks.ts` handles all CRUD. Important: tasks loaded from Sheets may have `questions: undefined` if the field was missing when saved. `readAllTasks()` normalises this:
```ts
return parsed.map((t: Task) => ({ ...t, questions: t.questions ?? [] }))
```
Always guard `.length` and `.map()` on `task.questions` in the UI too.

### Answer submissions
Each task's answers are written to a tab named after the task title. `app/api/submit/route.ts` calls `getTask(taskId)` to get the task's questions and tab name.

---

## Environment variables (Vercel)

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth app client secret |
| `GOOGLE_SHEET_ID` | Google Sheet ID for all data |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key (use `\\n` for newlines in Vercel) |
| `ALLOWED_TEACHER_EMAILS` | Comma-separated teacher emails (optional, has hardcoded fallback) |

**Do not use `NEXT_PUBLIC_APP_URL`** — it gets baked at build time and breaks when the domain changes. Base URL is derived from `new URL(req.url).origin` at request time.

---

## Google Cloud Console — OAuth
- Redirect URI registered: `https://ewm-livid.vercel.app/api/auth/google/callback`
- If the Vercel URL ever changes, the new URL must be added to the OAuth app's "Authorised redirect URIs" in Google Cloud Console

---

## Auth cookie reference

| Cookie | Value | Expires |
|---|---|---|
| `sf_session` | `admin_authenticated` | 8h |
| `sf_student` | `JSON.stringify({ studentNumber, name, email })` | 8h |
| `sf_oauth_state` | `teacher:<uuid>` or `student:<uuid>` | 5 min |
