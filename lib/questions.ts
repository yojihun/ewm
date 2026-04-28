import fs from 'fs'
import path from 'path'
import { google } from 'googleapis'

export interface Question {
  id: string
  text: string
  type: 'text' | 'textarea'
}

export interface FormConfig {
  title: string
  timeLimit: number
  questions: Question[]
}

const DEFAULT_CONFIG: FormConfig = { title: 'Quiz', timeLimit: 0, questions: [] }
const CONFIG_TAB = '_config'

function readFileConfig(): FormConfig {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'questions.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return { ...DEFAULT_CONFIG, questions: parsed }
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_CONFIG
  }
}

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

async function ensureConfigTab(sheets: ReturnType<typeof getSheetsClient>, spreadsheetId: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const exists = meta.data.sheets?.some((s) => s.properties?.title === CONFIG_TAB)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: CONFIG_TAB } } }] },
    })
  }
}

export async function readConfig(): Promise<FormConfig> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!spreadsheetId || !process.env.GOOGLE_PRIVATE_KEY) return readFileConfig()

  try {
    const sheets = getSheetsClient()
    await ensureConfigTab(sheets, spreadsheetId)

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${CONFIG_TAB}'!A1`,
    })

    const json = res.data.values?.[0]?.[0]
    if (!json) {
      const seed = readFileConfig()
      await writeConfig(seed)
      return seed
    }

    const parsed = JSON.parse(json)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return readFileConfig()
  }
}

export async function writeConfig(config: FormConfig): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!spreadsheetId || !process.env.GOOGLE_PRIVATE_KEY) return

  const sheets = getSheetsClient()
  await ensureConfigTab(sheets, spreadsheetId)

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${CONFIG_TAB}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [[JSON.stringify(config)]] },
  })
}
