import { expect, test } from '@playwright/test'

test('shows teacher login UI', async ({ page }) => {
  await page.goto('/admin')

  await expect(page.getByRole('heading', { name: 'Teacher Login' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Sign in with Google/i })).toBeVisible()
  await expect(page.getByText(/Only authorised school accounts/)).toBeVisible()
})

test('shows not_allowed error with email', async ({ page }) => {
  await page.goto('/admin?error=not_allowed&email=outsider%40example.com')

  await expect(page.getByText(/이 계정은 접근 권한이 없습니다/)).toBeVisible()
  await expect(page.getByText('outsider@example.com')).toBeVisible()
})

test('shows oauth_cancelled error', async ({ page }) => {
  await page.goto('/admin?error=oauth_cancelled')

  await expect(page.getByText(/로그인이 취소되었습니다/)).toBeVisible()
})

test('shows auth_failed error', async ({ page }) => {
  await page.goto('/admin?error=auth_failed')

  await expect(page.getByText(/인증에 실패했습니다/)).toBeVisible()
})
