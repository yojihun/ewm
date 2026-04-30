export const dynamic = 'force-dynamic'

import AdminDashboard from './AdminDashboard'

export default function Page() {
  const sheetId = process.env.GOOGLE_SHEET_ID ?? null
  return <AdminDashboard sheetId={sheetId} />
}
