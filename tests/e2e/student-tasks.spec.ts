import { expect, test } from '@playwright/test'

const student = {
  studentNumber: '1101',
  name: '강태우',
  email: 's2601@e-mirim.hs.kr',
}

const task = {
  id: 'task-1',
  title: 'Opinion Writing',
  timeLimit: 10,
  createdBy: '김지훈',
  createdAt: '2026-05-12T00:00:00.000Z',
  questions: [{ id: 'q1', text: 'What is your opinion?', type: 'textarea' }],
}

test('shows empty state when no tasks exist', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route('**/api/tasks', (route) => route.fulfill({ json: [] }))
  await page.goto('/')

  await expect(page.getByText('No tasks available yet.')).toBeVisible()
  await expect(page.getByText(/Check back later/)).toBeVisible()
})

test('shows task cards with title, time limit, and author', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route('**/api/tasks', (route) => route.fulfill({ json: [task] }))
  await page.goto('/')

  await expect(page.getByRole('button', { name: /Opinion Writing/ })).toBeVisible()
  await expect(page.getByText('10 min')).toBeVisible()
  await expect(page.getByText('by 김지훈')).toBeVisible()
})

test('clicking a task navigates to the form page', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route('**/api/tasks', (route) => route.fulfill({ json: [task] }))
  await page.route(/\/api\/tasks\/task-1$/, (route) =>
    route.fulfill({ json: task })
  )
  await page.route('**/api/session', (route) =>
    route.fulfill({ json: { ok: true, duplicate: false } })
  )
  await page.goto('/')

  await page.getByRole('button', { name: /Opinion Writing/ }).click()
  await page.waitForURL('**/form?taskId=task-1')
})

test('logout clears session and shows login view', async ({ page }) => {
  let deleteCount = 0
  await page.route('**/api/auth/student', async (route) => {
    if (route.request().method() === 'DELETE') {
      deleteCount += 1
      await route.fulfill({ json: { ok: true } })
    } else {
      await route.fulfill({ json: { student } })
    }
  })
  await page.route('**/api/tasks', (route) => route.fulfill({ json: [] }))
  await page.goto('/')

  await expect(page.getByRole('button', { name: /Logout/ })).toBeVisible()
  await page.getByRole('button', { name: /Logout/ }).click()

  await expect(page.getByRole('link', { name: /Sign in with Google/i })).toBeVisible()
  expect(deleteCount).toBe(1)
})

test('tasks API 401 clears student and shows login view', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route('**/api/tasks', (route) =>
    route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
  )
  await page.goto('/')

  await expect(page.getByRole('link', { name: /Sign in with Google/i })).toBeVisible()
})
