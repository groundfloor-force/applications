// ─────────────────────────────────────────────────────────────────────────────
// Maintenance intake — question-engine types
//
// These types describe a data-driven, rules-based question flow. The engine
// (engine.ts) is generic and knows nothing about plumbing or water leaks — all
// domain knowledge lives in workflow definitions (workflows/*.ts) and the
// deterministic severity rules (priority-rules.ts). Keeping the definitions as
// plain data is what lets us add new maintenance workflows without touching the
// engine or the UI.
// ─────────────────────────────────────────────────────────────────────────────

export type Priority = 'P1' | 'P2' | 'P3'

export type InputType =
  | 'single_choice'
  | 'multi_choice'
  | 'short_text'
  | 'long_text'
  | 'phone'
  | 'email'
  | 'address'
  | 'yes_no'
  | 'photo'
  | 'video'
  | 'date'
  | 'time_window'

/** A value stored for an answered question. */
export type AnswerValue = string | string[] | boolean | null

/** All answers collected so far, keyed by question id. */
export type AnswerMap = Record<string, AnswerValue>

export type DamageRisk = 'none' | 'low' | 'moderate' | 'high'

/**
 * The severity effect of choosing an answer. This is what makes priority
 * data-driven and editable — evaluateSeverity() collects the actions of every
 * chosen option and merges them (most-severe priority wins, flags union).
 */
export interface AnswerAction {
  setPriority?: Priority
  emergency?: boolean
  emergencyType?: string
  safetyFlags?: string[]
  damageRisk?: DamageRisk
  coordinatorReview?: boolean
  /** Override the suggested trade (e.g. "Gas-qualified technician"). Last one set wins. */
  suggestedTrade?: string
}

export interface AnswerOption {
  /** Stable machine value referenced by rules/conditions. Never change these. */
  value: string
  /** Human-facing label shown on the button. */
  label: string
  /** Optional direct routing when this option is chosen (wins over question.next). */
  goto?: string
  /** Severity effect of choosing this option (priority, emergency, safety flags). */
  action?: AnswerAction
}

// ── Conditions ───────────────────────────────────────────────────────────────
// A serialisable predicate over the collected answers. Used for branching
// (NextRule.when), conditional visibility (Question.visibleIf), dynamic option
// selection, and conditional safety messages.

export type CompareOp = 'eq' | 'neq' | 'in' | 'nin' | 'answered' | 'unanswered'

export interface Condition {
  questionId: string
  op: CompareOp
  value?: string | string[]
}

export interface ConditionGroup {
  all?: Predicate[]
  any?: Predicate[]
}

export type Predicate = Condition | ConditionGroup

// ── Branching ────────────────────────────────────────────────────────────────

export interface NextRule {
  /** If omitted, this rule is the default/fallback (matches unconditionally). */
  when?: Predicate
  /** Question id to advance to, or the sentinel 'END'. */
  goto: string
}

/** Answer options that depend on a previous answer (e.g. leak location by fixture). */
export interface DynamicOptions {
  basedOn: string
  map: Record<string, AnswerOption[]>
  default: AnswerOption[]
}

// ── Validation / media / safety ──────────────────────────────────────────────

export interface ValidationRule {
  /** RegExp source string, tested against the trimmed value. */
  pattern?: string
  minLength?: number
  maxLength?: number
  message?: string
}

export interface MediaRequirement {
  required: boolean
  minCount?: number
  /** Allow the user to declare capture unsafe and skip (waives `required`). */
  allowUnsafeSkip?: boolean
}

export interface SafetyMessage {
  /** Show only when this predicate matches (based on the just-given answer). */
  when?: Predicate
  text: string
  level?: 'warning' | 'danger'
}

// ── Questions & workflows ────────────────────────────────────────────────────

export interface Question {
  id: string
  text: string
  helpText?: string
  inputType: InputType
  options?: AnswerOption[]
  dynamicOptions?: DynamicOptions
  /** Defaults to true. Set optional:true to allow an empty answer. */
  optional?: boolean
  validation?: ValidationRule
  /** If present and false for the current answers, the engine skips this question. */
  visibleIf?: Predicate
  /**
   * Branching rules, evaluated in order; first match wins. If omitted (or no
   * rule matches and none is unconditional), the engine advances to the next
   * question in array order — this keeps the linear "shared tail" terse.
   */
  next?: NextRule[]
  safetyMessages?: SafetyMessage[]
  media?: MediaRequirement
  /** Render this question with the full-screen emergency treatment. */
  emergencyBanner?: boolean
  /** Grouping hint for the review screen (e.g. 'issue', 'contact', 'access'). */
  section?: string
}

export interface WorkflowDefinition {
  id: string
  version: string
  title: string
  /** Question id the flow starts on. */
  entry: string
  questions: Question[]
}

// ── Engine state ─────────────────────────────────────────────────────────────

export interface EngineState {
  workflowId: string
  workflowVersion: string
  /** Ordered ids of questions that have been answered (the branch taken). */
  path: string[]
  /** The question awaiting an answer, or null when the flow is complete. */
  currentQuestionId: string | null
  answers: AnswerMap
  /** Display labels for choice answers, keyed by question id (for review/history). */
  labels: Record<string, string>
  completed: boolean
}

/** One entry in the ordered question-and-answer history. */
export interface QAHistoryEntry {
  questionId: string
  question: string
  inputType: InputType
  answerValue: AnswerValue
  answerLabel: string
}
