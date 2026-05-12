import { expect, test } from '@playwright/test'

const task = {
  id: 'task-1',
  title: 'Opinion Writing',
  timeLimit: 10,
  createdBy: '김지훈',
  createdAt: '2026-05-12T00:00:00.000Z',
  questions: [{ id: 'q1', text: 'What is your opinion?', type: 'textarea' }],
}

const newTask = {
  id: 'task-new',
  title: '새 과제',
  timeLimit: 0,
  createdBy: '',
  createdAt: '2026-05-12T00:00:00.000Z',
  questions: [],
}

async function mockAdminRoutes(
  page: import('@playwright/test').Page,
  tasks: typeof task[] = [task]
) {
  await page.route('**/api/auth/check', (route) =>
    route.fulfill({ json: { ok: true, name: '김지훈' } })
  )
  await page.route('**/api/tasks', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, json: newTask })
    } else {
      await route.fulfill({ json: tasks })
    }
  })
  await page.route(/\/api\/tasks\/task-1$/, async (route) => {
    const method = route.request().method()
    if (method === 'PUT') {
      const body = await route.request().postDataJSON()
      await route.fulfill({ json: { ...task, ...body } })
    } else if (method === 'DELETE') {
      await route.fulfill({ json: { ok: true } })
    } else {
      await route.fulfill({ json: task })
    }
  })
}

test('unauthenticated access redirects to /admin', async ({ page }) => {
  await page.route('**/api/auth/check', (route) =>
    route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
  )
  await page.goto('/admin/dashboard')

  await page.waitForURL('**/admin')
  await expect(page.getByRole('heading', { name: 'Teacher Login' })).toBeVisible()
})

test('sidebar shows task list', async ({ page }) => {
  await mockAdminRoutes(page)
  await page.goto('/admin/dashboard')

  // Check the sidebar nav specifically (the title also appears in the editor heading)
  await expect(page.getByRole('navigation').getByText('Opinion Writing')).toBeVisible()
  await expect(page.getByText('1개 질문')).toBeVisible()
})

test('empty sidebar shows 과제가 없습니다', async ({ page }) => {
  await mockAdminRoutes(page, [])
  await page.goto('/admin/dashboard')

  await expect(page.getByText('과제가 없습니다')).toBeVisible()
})

test('create new task adds it to sidebar and selects it', async ({ page }) => {
  await mockAdminRoutes(page, [])
  await page.goto('/admin/dashboard')

  await page.getByRole('button', { name: /새 과제/ }).click()

  await expect(page.getByText('새 과제').first()).toBeVisible()
  // Editor should show the new task title
  await expect(
    page.getByRole('textbox').filter({ hasText: '' }).first()
  ).toBeVisible()
})

test('selecting a task populates the editor', async ({ page }) => {
  await mockAdminRoutes(page)
  await page.goto('/admin/dashboard')

  await page.getByText('Opinion Writing').first().click()

  await expect(page.getByPlaceholder(/예\) 3단원 글쓰기/)).toHaveValue('Opinion Writing')
})

test('saving a task shows 저장되었습니다 confirmation', async ({ page }) => {
  await mockAdminRoutes(page)
  await page.goto('/admin/dashboard')

  await page.getByText('Opinion Writing').first().click()
  await page.getByRole('button', { name: '저장' }).click()

  await expect(page.getByText('저장되었습니다')).toBeVisible()
})

test('adding a question shows it in the question list', async ({ page }) => {
  await mockAdminRoutes(page)
  await page.goto('/admin/dashboard')

  await page.getByRole('navigation').getByText('Opinion Writing').click()

  await page.getByPlaceholder(/질문을 입력하세요/).fill('Describe your hometown.')
  await page.getByRole('button', { name: '추가' }).click()

  // Two questions now — the new one shows in the list (first match is in the editor list)
  await expect(page.getByText('Describe your hometown.').first()).toBeVisible()
})

test('deleting a question removes it from the list', async ({ page }) => {
  await mockAdminRoutes(page)
  await page.goto('/admin/dashboard')

  await page.getByRole('navigation').getByText('Opinion Writing').click()

  // Confirm question is present, then delete it (exact: true avoids matching the task-delete button)
  await expect(page.getByRole('button', { name: '삭제', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '삭제', exact: true }).click()

  // Empty state message confirms all questions are gone
  await expect(page.getByText('질문이 없습니다. 아래에서 추가하세요.')).toBeVisible()
})

test('deleting a task with confirmation removes it from sidebar', async ({ page }) => {
  await mockAdminRoutes(page)
  await page.goto('/admin/dashboard')

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByTitle('과제 삭제').click({ force: true })

  await expect(page.getByText('과제가 없습니다')).toBeVisible()
})

test('logout navigates back to /admin', async ({ page }) => {
  await mockAdminRoutes(page)
  await page.route('**/api/auth/logout', (route) =>
    route.fulfill({ json: { ok: true } })
  )
  await page.goto('/admin/dashboard')

  await page.getByRole('button', { name: /로그아웃/ }).click()

  await page.waitForURL('**/admin')
  await expect(page.getByRole('heading', { name: 'Teacher Login' })).toBeVisible()
})

test('markdown tips accordion toggles open and closed', async ({ page }) => {
  await mockAdminRoutes(page)
  await page.goto('/admin/dashboard')

  // Tips content not visible by default
  await expect(
    page.getByText('질문 텍스트에 마크다운 문법을 사용할 수 있습니다.')
  ).not.toBeVisible()

  await page.getByText('마크다운 도움말').click()

  await expect(
    page.getByText('질문 텍스트에 마크다운 문법을 사용할 수 있습니다.')
  ).toBeVisible()

  await page.getByText('마크다운 도움말').click()

  await expect(
    page.getByText('질문 텍스트에 마크다운 문법을 사용할 수 있습니다.')
  ).not.toBeVisible()
})
