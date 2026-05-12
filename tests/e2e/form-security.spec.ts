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

async function setupForm(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route(/\/api\/tasks\/task-1$/, (route) =>
    route.fulfill({ json: task })
  )
  await page.route('**/api/session', (route) =>
    route.fulfill({ json: { ok: true, duplicate: false } })
  )
  await page.goto('/form?taskId=task-1')
  await page.getByPlaceholder('Type your answer here...').fill('Draft answer')
}

test('copy event auto-submits and shows cheating screen', async ({ page }) => {
  await setupForm(page)
  let submitRequests = 0
  await page.route('**/api/submit', (route) => {
    submitRequests += 1
    return route.fulfill({ json: { ok: true } })
  })

  await page.evaluate(() =>
    document.dispatchEvent(new ClipboardEvent('copy'))
  )

  await expect(page.getByRole('heading', { name: '세션 종료' })).toBeVisible()
  expect(submitRequests).toBe(1)
})

test('cut event auto-submits and shows cheating screen', async ({ page }) => {
  await setupForm(page)
  let submitRequests = 0
  await page.route('**/api/submit', (route) => {
    submitRequests += 1
    return route.fulfill({ json: { ok: true } })
  })

  await page.evaluate(() =>
    document.dispatchEvent(new ClipboardEvent('cut'))
  )

  await expect(page.getByRole('heading', { name: '세션 종료' })).toBeVisible()
  expect(submitRequests).toBe(1)
})

test('paste event is blocked and auto-submits', async ({ page }) => {
  await setupForm(page)
  let submitRequests = 0
  await page.route('**/api/submit', (route) => {
    submitRequests += 1
    return route.fulfill({ json: { ok: true } })
  })

  // Dispatch directly on document — same as the browser's native paste event
  await page.evaluate(() =>
    document.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true }))
  )

  await expect(page.getByRole('heading', { name: '세션 종료' })).toBeVisible()
  expect(submitRequests).toBe(1)
})

test('tab visibility change auto-submits and shows cheating screen', async ({ page }) => {
  await setupForm(page)
  let submitRequests = 0
  await page.route('**/api/submit', (route) => {
    submitRequests += 1
    return route.fulfill({ json: { ok: true } })
  })

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })

  await expect(page.getByRole('heading', { name: '세션 종료' })).toBeVisible()
  expect(submitRequests).toBe(1)
})

test('page reload is treated as cheating and auto-submits', async ({ page }) => {
  await page.route('**/api/auth/student', (route) =>
    route.fulfill({ json: { student } })
  )
  await page.route(/\/api\/tasks\/task-1$/, (route) =>
    route.fulfill({ json: task })
  )
  await page.route('**/api/session', (route) =>
    route.fulfill({ json: { ok: true, duplicate: false } })
  )

  await page.goto('/form?taskId=task-1')
  // First load — nav.type === 'navigate', no refresh flag

  let submitRequests = 0
  await page.route('**/api/submit', (route) => {
    submitRequests += 1
    return route.fulfill({ json: { ok: true } })
  })

  // Reload — nav.type === 'reload', triggers refresh detection + auto-submit
  await page.reload()

  await expect(page.getByRole('heading', { name: '세션 종료' })).toBeVisible()
  expect(submitRequests).toBe(1)
})
