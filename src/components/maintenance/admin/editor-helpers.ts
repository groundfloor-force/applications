import type { WorkflowDefinition, Question, Condition } from '@/lib/maintenance/types'

export const INPUT_TYPES = [
  'single_choice', 'multi_choice', 'yes_no', 'short_text', 'long_text',
  'phone', 'email', 'address', 'photo', 'video', 'date', 'time_window',
] as const

export const CHOICE_TYPES = new Set(['single_choice', 'multi_choice', 'yes_no'])

export const OPS: { value: Condition['op']; label: string }[] = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
  { value: 'in', label: 'is one of' },
  { value: 'nin', label: 'is none of' },
  { value: 'answered', label: 'is answered' },
  { value: 'unanswered', label: 'is not answered' },
]

export const SECTIONS = ['issue', 'media', 'contact', 'property', 'access', 'comments']

/** Deep clone (workflows are plain JSON). */
export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

/**
 * Rewrite self-referential `when q = value → goto` branch rules as per-option
 * `goto`s, so the editor can present simple "choose X → goes to Y" routing.
 * Cross-question and non-eq rules are left in `next` (edited as advanced rules).
 */
export function normalizeWorkflow(wf: WorkflowDefinition): WorkflowDefinition {
  const c = clone(wf)
  for (const q of c.questions) {
    if (!q.next) continue
    const remaining: NonNullable<Question['next']> = []
    for (const rule of q.next) {
      const w = rule.when
      const isSelfEq =
        w && !('all' in w) && !('any' in w) &&
        (w as Condition).questionId === q.id && (w as Condition).op === 'eq' &&
        typeof (w as Condition).value === 'string'
      if (isSelfEq) {
        const opt = q.options?.find((o) => o.value === (w as Condition).value)
        if (opt && !opt.goto) {
          opt.goto = rule.goto
          continue
        }
      }
      remaining.push(rule)
    }
    q.next = remaining.length ? remaining : undefined
  }
  return c
}

let counter = 0
export function newQuestionId(existing: Set<string>): string {
  let id = ''
  do {
    counter += 1
    id = `q_new_${counter}`
  } while (existing.has(id))
  return id
}

export function newQuestion(id: string): Question {
  return {
    id,
    text: 'New question',
    inputType: 'single_choice',
    section: 'issue',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  }
}

/** Short label for a target dropdown option. */
export function targetLabel(wf: WorkflowDefinition, id: string): string {
  if (id === 'END') return 'END (submit)'
  const q = wf.questions.find((x) => x.id === id)
  const text = q?.text ? ` — ${q.text.slice(0, 40)}` : ''
  return `${id}${text}`
}
