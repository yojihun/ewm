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
  questions: [
    {
      id: 'q1',
      text: 'What is your opinion?',
      type: 'textarea',
    },
  ],
}

test('task list retries a temporary task API failure before showing tasks', async ({ page }) => {
  let taskRequests = 0

  await page.route('**/api/auth/student', async (route) => {
    await route.fulfill({ json: { student } })
  })
  await page.route(/\/api\/tasks$/, async (route) => {
    taskRequests += 1
    if (taskRequests === 1) {
      await route.fulfill({ status: 503, json: { error: 'temporary outage' } })
      return
    }
    await route.fulfill({ json: [task] })
  })

  await page.goto('/')

  await expect(page.getByRole('button', { name: /Opinion Writing/ })).toBeVisible()
  await expect(page.getByText('No tasks available yet.')).toHaveCount(0)
  expect(taskRequests).toBe(2)
})

test('task page retries a temporary task lookup failure', async ({ page }) => {
  let taskRequests = 0

  await page.route('**/api/auth/student', async (route) => {
    await route.fulfill({ json: { student } })
  })
  await page.route(/\/api\/tasks\/task-1$/, async (route) => {
    taskRequests += 1
    if (taskRequests === 1) {
      await route.fulfill({ status: 503, json: { error: 'temporary outage' } })
      return
    }
    await route.fulfill({ json: task })
  })
  await page.route('**/api/session', async (route) => {
    await route.fulfill({ json: { ok: true, duplicate: false } })
  })

  await page.goto('/form?taskId=task-1')

  await expect(page.getByRole('heading', { name: 'Opinion Writing' })).toBeVisible()
  await expect(page.getByText(/Could not load this task/)).toHaveCount(0)
  expect(taskRequests).toBe(2)
})

test('transient window blur does not auto-submit when focus returns immediately', async ({ page }) => {
  await page.route('**/api/auth/student', async (route) => {
    await route.fulfill({ json: { student } })
  })
  await page.route(/\/api\/tasks\/task-1$/, async (route) => {
    await route.fulfill({ json: task })
  })
  await page.route('**/api/session', async (route) => {
    await route.fulfill({ json: { ok: true, duplicate: false } })
  })

  let submitRequests = 0
  await page.route('**/api/submit', async (route) => {
    submitRequests += 1
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/form?taskId=task-1')
  await page.getByPlaceholder('Type your answer here...').fill('A careful answer in progress.')
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'))
  })
  await page.waitForTimeout(500)

  await expect(page.getByRole('button', { name: /Submit Answers/ })).toBeVisible()
  await expect(page.getByText('Submitted!')).toHaveCount(0)
  expect(submitRequests).toBe(0)
})

test('persistent app or virtual desktop blur auto-submits the session', async ({ page }) => {
  await page.route('**/api/auth/student', async (route) => {
    await route.fulfill({ json: { student } })
  })
  await page.route(/\/api\/tasks\/task-1$/, async (route) => {
    await route.fulfill({ json: task })
  })
  await page.route('**/api/session', async (route) => {
    await route.fulfill({ json: { ok: true, duplicate: false } })
  })

  let submitRequests = 0
  await page.route('**/api/submit', async (route) => {
    submitRequests += 1
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/form?taskId=task-1')
  await page.getByPlaceholder('Type your answer here...').fill('A careful answer in progress.')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hasFocus', {
      configurable: true,
      value: () => false,
    })
    window.dispatchEvent(new Event('blur'))
  })

  await expect(page.getByRole('heading', { name: '세션 종료' })).toBeVisible()
  expect(submitRequests).toBe(1)
})

test('spotlight shortcut auto-submits the session', async ({ page }) => {
  await page.route('**/api/auth/student', async (route) => {
    await route.fulfill({ json: { student } })
  })
  await page.route(/\/api\/tasks\/task-1$/, async (route) => {
    await route.fulfill({ json: task })
  })
  await page.route('**/api/session', async (route) => {
    await route.fulfill({ json: { ok: true, duplicate: false } })
  })

  let submitRequests = 0
  await page.route('**/api/submit', async (route) => {
    submitRequests += 1
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/form?taskId=task-1')
  await page.getByPlaceholder('Type your answer here...').fill('A careful answer in progress.')
  await page.keyboard.press('Meta+Space')

  await expect(page.getByRole('heading', { name: '세션 종료' })).toBeVisible()
  expect(submitRequests).toBe(1)
})

test('duplicate session auto-submits the current session', async ({ page }) => {
  await page.route('**/api/auth/student', async (route) => {
    await route.fulfill({ json: { student } })
  })
  await page.route(/\/api\/tasks\/task-1$/, async (route) => {
    await route.fulfill({ json: task })
  })

  let sessionRequests = 0
  await page.route('**/api/session', async (route) => {
    sessionRequests += 1
    if (sessionRequests === 1) {
      await route.fulfill({ json: { ok: true, duplicate: true } })
      return
    }
    await route.fulfill({ json: { ok: true, duplicate: false } })
  })

  let submitRequests = 0
  await page.route('**/api/submit', async (route) => {
    submitRequests += 1
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/form?taskId=task-1')

  await expect(page.getByRole('heading', { name: '세션 종료' })).toBeVisible()
  expect(submitRequests).toBe(1)
})
