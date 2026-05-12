import { expect, test } from '@playwright/test'

const student = {
  studentNumber: '1101',
  name: '강태우',
  email: 's2601@e-mirim.hs.kr',
}

test('shows login UI when not authenticated', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student: null } })
  )
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'English Writing in Mirim' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Sign in with Google/i })).toBeVisible()
  await expect(page.getByText('@e-mirim.hs.kr')).toBeVisible()
})

test('shows not_allowed error with email', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student: null } })
  )
  await page.goto('/?error=not_allowed&email=unknown%40test.com')

  await expect(page.getByText(/이 계정은 등록된 학생 계정이 아닙니다/)).toBeVisible()
  await expect(page.getByText('unknown@test.com')).toBeVisible()
})

test('shows oauth_cancelled error', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student: null } })
  )
  await page.goto('/?error=oauth_cancelled')

  await expect(page.getByText(/로그인이 취소되었습니다/)).toBeVisible()
})

test('shows invalid_state error', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student: null } })
  )
  await page.goto('/?error=invalid_state')

  await expect(page.getByText(/보안 오류가 발생했습니다/)).toBeVisible()
})

test('shows auth_failed error', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student: null } })
  )
  await page.goto('/?error=auth_failed')

  await expect(page.getByText(/인증에 실패했습니다/)).toBeVisible()
})

test('shows oauth_not_configured error', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student: null } })
  )
  await page.goto('/?error=oauth_not_configured')

  await expect(page.getByText(/Google 로그인이 설정되지 않았습니다/)).toBeVisible()
})

test('authenticated student sees task list instead of login', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route('**/api/tasks', (route) => route.fulfill({ json: [] }))
  await page.goto('/')

  await expect(page.getByRole('link', { name: /Sign in with Google/i })).not.toBeVisible()
  await expect(page.getByText('No tasks available yet.')).toBeVisible()
})
