import nodemailer from 'nodemailer'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

interface SecurityCounts {
  tabSwitchCount: number
  copyCount: number
  pasteCount: number
  refreshCount: number
  windowBlurCount: number
  spotlightCount: number
  duplicateSession: boolean
}

interface SendSubmissionEmailParams {
  to: string
  studentName: string
  studentNumber: string
  quizTitle: string
  questions: { id: string; text: string }[]
  answers: Record<string, string>
  securityCounts?: SecurityCounts
}

export async function sendSubmissionEmail({
  to,
  studentName,
  studentNumber,
  quizTitle,
  questions,
  answers,
  securityCounts,
}: SendSubmissionEmailParams): Promise<void> {
  const answersHtml = questions
    .map(
      (q, i) => `
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 6px;font-weight:600;color:#1e293b;">${i + 1}. ${escapeHtml(q.text)}</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;color:#334155;font-size:14px;white-space:pre-wrap;">${escapeHtml(answers[q.id]?.trim() || '(no answer)')}</div>
      </div>`
    )
    .join('')

  const securityHtml = securityCounts
    ? `
      <div style="margin-bottom:24px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
        <p style="margin:0 0 10px;font-weight:700;color:#991b1b;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Security Event Summary</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:5px 8px;">Tab switches</td>
            <td style="padding:5px 8px;font-weight:600;color:${securityCounts.tabSwitchCount > 0 ? '#b91c1c' : '#15803d'};">${securityCounts.tabSwitchCount}</td>
          </tr>
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:5px 8px;">App / virtual desktop switches</td>
            <td style="padding:5px 8px;font-weight:600;color:${securityCounts.windowBlurCount > 0 ? '#b91c1c' : '#15803d'};">${securityCounts.windowBlurCount}</td>
          </tr>
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:5px 8px;">Page refreshes</td>
            <td style="padding:5px 8px;font-weight:600;color:${securityCounts.refreshCount > 0 ? '#b91c1c' : '#15803d'};">${securityCounts.refreshCount}</td>
          </tr>
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:5px 8px;">Copy / select-all attempts</td>
            <td style="padding:5px 8px;font-weight:600;color:${securityCounts.copyCount > 0 ? '#b91c1c' : '#15803d'};">${securityCounts.copyCount}</td>
          </tr>
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:5px 8px;">Paste attempts (blocked)</td>
            <td style="padding:5px 8px;font-weight:600;color:${securityCounts.pasteCount > 0 ? '#b91c1c' : '#15803d'};">${securityCounts.pasteCount}</td>
          </tr>
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:5px 8px;">Spotlight / search shortcut (⌘Space)</td>
            <td style="padding:5px 8px;font-weight:600;color:${securityCounts.spotlightCount > 0 ? '#b91c1c' : '#15803d'};">${securityCounts.spotlightCount}</td>
          </tr>
          <tr>
            <td style="padding:5px 8px;">Duplicate login detected</td>
            <td style="padding:5px 8px;font-weight:600;color:${securityCounts.duplicateSession ? '#b91c1c' : '#15803d'};">${securityCounts.duplicateSession ? 'YES ⚠️' : 'NO'}</td>
          </tr>
        </table>
      </div>`
    : ''

  await getTransporter().sendMail({
    from: `SecureForm <${process.env.GMAIL_USER}>`,
    to,
    subject: `[${quizTitle}] Your submitted answers`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b;">
        <h1 style="font-size:20px;font-weight:700;margin:0 0 4px;">${escapeHtml(quizTitle)}</h1>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Submission confirmation for ${escapeHtml(studentName)} (${escapeHtml(studentNumber)})</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:24px;" />
        ${securityHtml}
        ${answersHtml}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin-top:8px;margin-bottom:16px;" />
        <p style="font-size:12px;color:#94a3b8;margin:0;">This is an automated confirmation. Do not reply to this email.</p>
      </div>
    `,
  })
}
