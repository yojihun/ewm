import { NextRequest, NextResponse } from 'next/server'
import { readConfig, writeConfig, Question } from '@/lib/questions'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const config = await readConfig()
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const config = await readConfig()
  const newQuestion: Question = {
    id: Date.now().toString(),
    text: body.text,
    type: body.type ?? 'textarea',
  }
  config.questions.push(newQuestion)
  await writeConfig(config)
  return NextResponse.json(newQuestion)
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const config = await readConfig()

  if (body.title !== undefined) {
    config.title = body.title
    await writeConfig(config)
    return NextResponse.json({ title: config.title })
  }

  if (body.timeLimit !== undefined) {
    config.timeLimit = Number(body.timeLimit)
    await writeConfig(config)
    return NextResponse.json({ timeLimit: config.timeLimit })
  }

  const idx = config.questions.findIndex((q) => q.id === body.id)
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  config.questions[idx] = { ...config.questions[idx], text: body.text, type: body.type }
  await writeConfig(config)
  return NextResponse.json(config.questions[idx])
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await req.json()
  const config = await readConfig()
  config.questions = config.questions.filter((q) => q.id !== id)
  await writeConfig(config)
  return NextResponse.json({ ok: true })
}
