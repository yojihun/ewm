import { NextRequest, NextResponse } from 'next/server'
import { readAllTasks, createTask } from '@/lib/tasks'
import { requireAdmin, requireSession } from '@/lib/auth'

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const tasks = await readAllTasks()
    return NextResponse.json(tasks)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[tasks GET]', message)
    return NextResponse.json({ error: 'Unable to load tasks. Please refresh in a moment.' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const task = await createTask({
      title: body.title ?? 'Untitled Task',
      timeLimit: Number(body.timeLimit) || 0,
      questions: body.questions ?? [],
      createdBy: body.createdBy ?? '',
    })
    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[tasks POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
