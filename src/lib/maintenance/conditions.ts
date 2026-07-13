import type { AnswerMap, AnswerValue, Predicate, Condition, ConditionGroup } from './types'

function isGroup(p: Predicate): p is ConditionGroup {
  return (p as ConditionGroup).all !== undefined || (p as ConditionGroup).any !== undefined
}

function valuesOf(v: AnswerValue): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.map(String)
  return [String(v)]
}

function evalCondition(c: Condition, answers: AnswerMap): boolean {
  const raw = answers[c.questionId]
  const answered = raw != null && (Array.isArray(raw) ? raw.length > 0 : String(raw).length > 0)

  switch (c.op) {
    case 'answered':
      return answered
    case 'unanswered':
      return !answered
    case 'eq':
      return valuesOf(raw).includes(String(c.value))
    case 'neq':
      return !valuesOf(raw).includes(String(c.value))
    case 'in': {
      const set = new Set((Array.isArray(c.value) ? c.value : [c.value]).map(String))
      return valuesOf(raw).some((v) => set.has(v))
    }
    case 'nin': {
      const set = new Set((Array.isArray(c.value) ? c.value : [c.value]).map(String))
      return !valuesOf(raw).some((v) => set.has(v))
    }
    default:
      return false
  }
}

/** Deterministically evaluate a serialisable predicate against collected answers. */
export function evalPredicate(p: Predicate, answers: AnswerMap): boolean {
  if (isGroup(p)) {
    if (p.all && !p.all.every((sub) => evalPredicate(sub, answers))) return false
    if (p.any && !p.any.some((sub) => evalPredicate(sub, answers))) return false
    // A group with neither all nor any is vacuously true.
    return true
  }
  return evalCondition(p, answers)
}
