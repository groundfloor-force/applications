// Structural validation for a WorkflowDefinition. Run before persisting an
// edited workflow so a malformed definition can never reach the public form.

import type { WorkflowDefinition, Question, Predicate, Condition, ConditionGroup } from './types'
import { END } from './engine'

const INPUT_TYPES = new Set([
  'single_choice', 'multi_choice', 'short_text', 'long_text', 'phone', 'email',
  'address', 'yes_no', 'photo', 'video', 'date', 'time_window',
])

function predicateRefs(p: Predicate, out: Set<string>): void {
  const group = p as ConditionGroup
  if (group.all || group.any) {
    ;[...(group.all ?? []), ...(group.any ?? [])].forEach((sub) => predicateRefs(sub, out))
    return
  }
  out.add((p as Condition).questionId)
}

/** Returns a list of human-readable errors; empty array means the workflow is valid. */
export function validateWorkflow(wf: WorkflowDefinition): string[] {
  const errors: string[] = []

  if (!wf.id?.trim()) errors.push('Workflow id is required.')
  if (!wf.version?.trim()) errors.push('Workflow version is required.')
  if (!Array.isArray(wf.questions) || wf.questions.length === 0) {
    errors.push('Workflow must have at least one question.')
    return errors
  }

  const ids = new Set<string>()
  for (const q of wf.questions) {
    if (!q.id?.trim()) errors.push('Every question needs an id.')
    else if (ids.has(q.id)) errors.push(`Duplicate question id: ${q.id}`)
    else ids.add(q.id)
  }

  const isTarget = (t: string) => t === END || ids.has(t)

  if (!wf.entry || !ids.has(wf.entry)) {
    errors.push(`Entry question "${wf.entry}" does not exist.`)
  }

  for (const q of wf.questions as Question[]) {
    if (!q.text?.trim()) errors.push(`Question "${q.id}" has no text.`)
    if (!INPUT_TYPES.has(q.inputType)) errors.push(`Question "${q.id}" has invalid input type "${q.inputType}".`)

    // Branch targets must resolve to a real question or END.
    for (const rule of q.next ?? []) {
      if (!isTarget(rule.goto)) errors.push(`Question "${q.id}" branches to unknown target "${rule.goto}".`)
      if (rule.when) {
        const refs = new Set<string>()
        predicateRefs(rule.when, refs)
        refs.forEach((r) => { if (!ids.has(r)) errors.push(`Question "${q.id}" branch condition references unknown question "${r}".`) })
      }
    }
    for (const o of q.options ?? []) {
      if (o.goto && !isTarget(o.goto)) errors.push(`Option "${o.value}" of "${q.id}" points to unknown target "${o.goto}".`)
    }
    if (q.dynamicOptions) {
      if (!ids.has(q.dynamicOptions.basedOn)) {
        errors.push(`Question "${q.id}" dynamic options reference unknown question "${q.dynamicOptions.basedOn}".`)
      }
      // The engine resolves the chosen option through the dynamic map too, so
      // these `goto`s are live routing and need the same check.
      const sets = [...Object.values(q.dynamicOptions.map), q.dynamicOptions.default ?? []]
      for (const set of sets) {
        for (const o of set) {
          if (o.goto && !isTarget(o.goto)) errors.push(`Dynamic option "${o.value}" of "${q.id}" points to unknown target "${o.goto}".`)
        }
      }
    }
    if (q.visibleIf) {
      const refs = new Set<string>()
      predicateRefs(q.visibleIf, refs)
      refs.forEach((r) => { if (!ids.has(r)) errors.push(`Question "${q.id}" visibility references unknown question "${r}".`) })
    }
  }

  return errors
}
