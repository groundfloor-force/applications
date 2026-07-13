import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getActiveWorkflow, saveActiveWorkflow, listWorkflowVersions } from '@/lib/maintenance/workflow-store'
import { validateWorkflow } from '@/lib/maintenance/validate-workflow'
import type { WorkflowDefinition } from '@/lib/maintenance/types'

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  return !!cookieStore.get('admin_session')
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const [workflow, versions] = await Promise.all([getActiveWorkflow(), listWorkflowVersions()])
    return NextResponse.json({ workflow, versions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await req.json()) as { workflow?: WorkflowDefinition }
    if (!body.workflow) {
      return NextResponse.json({ error: 'Missing workflow' }, { status: 400 })
    }
    const errors = validateWorkflow(body.workflow)
    if (errors.length) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
    }
    const result = await saveActiveWorkflow(body.workflow)
    if (!result.ok) {
      return NextResponse.json({ error: 'Save failed', errors: result.errors }, { status: 400 })
    }
    return NextResponse.json({ success: true, url: result.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
