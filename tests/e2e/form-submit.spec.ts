import { expect, test } from '@playwright/test'

const student = {
  studentNumber: '1101',
  name: '강태우',
  email: 's2601@e-mirim.hs.kr',
}

const task = {
  id: 'task-1',
  title: 'Opinion Writing',
  timeLimit: 0,
  createdBy: '김지훈',
  createdAt: '2026-05-12T00:00:00.000Z',
  questions: [{ id: 'q1', text: 'What is your opinion?', type: 'textarea' }],
}

async function mockFormRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route(/\/api\/tasks\/task-1$/, (route) =>
    route.fulfill({ json: task })
  )
  await page.route('**/api/session', (route) =>
    route.fulfill({ json: { ok: true, duplicate: false } })
  )
}

test('missing taskId redirects to home', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route('**/api/tasks', (route) => route.fulfill({ json: [] }))
  await page.goto('/form')

  await page.waitForURL('/')
})

test('task 404 redirects to home', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route(/\/api\/tasks\/nonexistent$/, (route) =>
    route.fulfill({ status: 404, json: { error: 'Not found' } })
  )
  await page.route('**/api/tasks', (route) => route.fulfill({ json: [] }))
  await page.goto('/form?taskId=nonexistent')

  await page.waitForURL('/')
})

test('security warning banner is always visible on the form', async ({ page }) => {
  await mockFormRoutes(page)
  await page.goto('/form?taskId=task-1')

  await expect(
    page.getByRole('heading', { name: /Security Warning/i })
  ).toBeVisible()
  await expect(page.getByText(/Anti-Cheat Protocol/)).toBeVisible()
})

test('progress bar advances as questions are answered', async ({ page }) => {
  await mockFormRoutes(page)
  await page.goto('/form?taskId=task-1')

  await expect(page.getByText('0 / 1 answered')).toBeVisible()

  await page.getByPlaceholder('Type your answer here...').fill('My answer')

  await expect(page.getByText('1 / 1 answered')).toBeVisible()
})

test('SecureTextarea shows live word and character counts', async ({ page }) => {
  await mockFormRoutes(page)
  await page.goto('/form?taskId=task-1')

  await page.getByPlaceholder('Type your answer here...').fill('Hello World')

  await expect(page.getByText(/11.+1000 characters/)).toBeVisible()
  await expect(page.getByText('2 words')).toBeVisible()
})

test('submitting with unanswered questions shows validation error', async ({ page }) => {
  await mockFormRoutes(page)
  await page.goto('/form?taskId=task-1')

  await page.getByRole('button', { name: /Submit Answers/ }).click()

  await expect(
    page.getByText('Please answer all questions before submitting.')
  ).toBeVisible()
})

test('successful submission shows confirmation screen', async ({ page }) => {
  await mockFormRoutes(page)
  await page.route('**/api/submit', (route) =>
    route.fulfill({ json: { ok: true } })
  )
  await page.goto('/form?taskId=task-1')

  await page.getByPlaceholder('Type your answer here...').fill('My thoughtful answer')
  await page.getByRole('button', { name: /Submit Answers/ }).click()

  await expect(page.getByRole('heading', { name: 'Submitted!' })).toBeVisible()
  await expect(page.getByText(`Thank you, ${student.name}.`)).toBeVisible()
})

test('timer starts only on first keystroke', async ({ page }) => {
  const timedTask = { ...task, timeLimit: 5 }
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route(/\/api\/tasks\/task-1$/, (route) =>
    route.fulfill({ json: timedTask })
  )
  await page.route('**/api/session', (route) =>
    route.fulfill({ json: { ok: true, duplicate: false } })
  )
  await page.goto('/form?taskId=task-1')

  // Static timer shown before any input
  await expect(page.getByText('05:00')).toBeVisible()
  await expect(page.getByText('starts on first keystroke')).toBeVisible()

  // Start typing — timer activates and hint disappears
  await page.getByPlaceholder('Type your answer here...').fill('x')

  await expect(page.getByText('starts on first keystroke')).not.toBeVisible()
})

test("timer expiry auto-submits and shows time's up screen", async ({ page }) => {
  // timeLimit in minutes; 2/60 ≈ 0.033 min → 2 real seconds, fast enough for a test
  const quickTask = { ...task, timeLimit: 2 / 60 }
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route(/\/api\/tasks\/task-1$/, (route) =>
    route.fulfill({ json: quickTask })
  )
  await page.route('**/api/session', (route) =>
    route.fulfill({ json: { ok: true, duplicate: false } })
  )
  await page.route('**/api/submit', (route) =>
    route.fulfill({ json: { ok: true } })
  )
  await page.goto('/form?taskId=task-1')

  // Typing starts the timer
  await page.getByPlaceholder('Type your answer here...').fill('My answer')

  // The 2-second timer will expire and auto-submit naturally
  await expect(page.getByRole('heading', { name: "Time's Up!" })).toBeVisible({ timeout: 8000 })
})
