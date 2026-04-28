import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

interface SendSubmissionEmailParams {
  to: string
  studentName: string
  studentNumber: string
  quizTitle: string
  questions: { id: string; text: string }[]
  answers: Record<string, string>
}

export async function sendSubmissionEmail({
  to,
  studentName,
  studentNumber,
  quizTitle,
  questions,
  answers,
}: SendSubmissionEmailParams): Promise<void> {
  const answersHtml = questions
    .map(
      (q, i) => `
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 6px;font-weight:600;color:#1e293b;">${i + 1}. ${q.text}</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;color:#334155;font-size:14px;white-space:pre-wrap;">${answers[q.id]?.trim() || '(no answer)'}</div>
      </div>`
    )
    .join('')

  await getTransporter().sendMail({
    from: `SecureForm <${process.env.GMAIL_USER}>`,
    to,
    subject: `[${quizTitle}] Your submitted answers`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b;">
        <h1 style="font-size:20px;font-weight:700;margin:0 0 4px;">${quizTitle}</h1>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Submission confirmation for ${studentName} (${studentNumber})</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:24px;" />
        ${answersHtml}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin-top:8px;margin-bottom:16px;" />
        <p style="font-size:12px;color:#94a3b8;margin:0;">This is an automated confirmation. Do not reply to this email.</p>
      </div>
    `,
  })
}
