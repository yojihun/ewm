import { NextRequest, NextResponse } from 'next/server'
import { getTask, updateTask, deleteTask } from '@/lib/tasks'
import { requireAdmin, requireSession } from '@/lib/auth'

function parseGrade(raw: unknown): 1 | 2 | 3 | undefined {
  if (raw === undefined) return undefined
  const grade = Number(raw)
  if (grade === 2 || grade === 3) return grade
  return 1
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const task = await getTask(id)
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(task)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[tasks GET id]', message)
    return NextResponse.json({ error: 'Unable to load this task. Please refresh in a moment.' }, { status: 503 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const updated = await updateTask(id, {
    title: body.title,
    grade: parseGrade(body.grade),
    timeLimit: body.timeLimit !== undefined ? Number(body.timeLimit) : undefined,
    questions: body.questions,
  })
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const ok = await deleteTask(id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
