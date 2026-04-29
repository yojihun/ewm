import { google } from 'googleapis'

export interface Question {
  id: string
  text: string
  type: 'text' | 'textarea'
}

export interface Task {
  id: string
  title: string
  timeLimit: number
  questions: Question[]
  createdBy: string
  createdAt: string
}

const TASKS_TAB = '_tasks'

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function ensureTasksTab(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string
) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const exists = meta.data.sheets?.some((s) => s.properties?.title === TASKS_TAB)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TASKS_TAB } } }] },
    })
  }
}

export async function readAllTasks(): Promise<Task[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!spreadsheetId || !process.env.GOOGLE_PRIVATE_KEY) return []

  try {
    const sheets = getSheetsClient()
    await ensureTasksTab(sheets, spreadsheetId)

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${TASKS_TAB}'!A1`,
    })

    const json = res.data.values?.[0]?.[0]
    if (!json) return []

    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function writeAllTasks(tasks: Task[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!spreadsheetId || !process.env.GOOGLE_PRIVATE_KEY) return

  const sheets = getSheetsClient()
  await ensureTasksTab(sheets, spreadsheetId)

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${TASKS_TAB}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [[JSON.stringify(tasks)]] },
  })
}

export async function getTask(id: string): Promise<Task | null> {
  const tasks = await readAllTasks()
  return tasks.find((t) => t.id === id) ?? null
}

export async function createTask(
  input: Omit<Task, 'id' | 'createdAt'>
): Promise<Task> {
  const tasks = await readAllTasks()
  const task: Task = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await writeAllTasks([...tasks, task])
  return task
}

export async function updateTask(
  id: string,
  patch: Partial<Omit<Task, 'id' | 'createdAt' | 'createdBy'>>
): Promise<Task | null> {
  const tasks = await readAllTasks()
  const idx = tasks.findIndex((t) => t.id === id)
  if (idx === -1) return null

  const updated = { ...tasks[idx], ...patch }
  tasks[idx] = updated
  await writeAllTasks(tasks)
  return updated
}

export async function deleteTask(id: string): Promise<boolean> {
  const tasks = await readAllTasks()
  const filtered = tasks.filter((t) => t.id !== id)
  if (filtered.length === tasks.length) return false
  await writeAllTasks(filtered)
  return true
}
