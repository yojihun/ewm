import { google } from 'googleapis'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

async function ensureSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabTitle: string
): Promise<boolean> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === tabTitle
  )
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabTitle } } }],
      },
    })
    return true
  }
  return false
}

export async function appendRow(tabTitle: string, header: string[], values: string[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is not set')

  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const isNew = await ensureSheet(sheets, spreadsheetId, tabTitle)

  const rows = isNew ? [header, values] : [values]

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${tabTitle}'`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  })
}
