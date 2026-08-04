'use client'

import { useMemo, useState } from 'react'
import type {
  WorkflowDefinition,
  Question,
  AnswerOption,
  AnswerAction,
  Condition,
  Priority,
  DamageRisk,
  InputType,
} from '@/lib/maintenance/types'
import {
  INPUT_TYPES,
  CHOICE_TYPES,
  OPS,
  SECTIONS,
  clone,
  normalizeWorkflow,
  newQuestion,
  newQuestionId,
  targetLabel,
} from './editor-helpers'

interface VersionRef {
  pathname: string
  url: string
  uploadedAt: string
}

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3']
const DAMAGE: DamageRisk[] = ['none', 'low', 'moderate', 'high']

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">{children}</p>
}

export default function WorkflowEditor({
  initial,
  initialVersions,
  builtIn,
}: {
  initial: WorkflowDefinition
  initialVersions: VersionRef[]
  /** The workflow that ships with the code — see `loadBuiltIn` below. */
  builtIn?: WorkflowDefinition | null
}) {
  const [wf, setWf] = useState<WorkflowDefinition>(() => normalizeWorkflow(initial))
  const [selected, setSelected] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [versions, setVersions] = useState<VersionRef[]>(initialVersions)
  const [showVersions, setShowVersions] = useState(false)

  const targetIds = useMemo(() => ['END', ...wf.questions.map((q) => q.id)], [wf.questions])

  const q = wf.questions[selected]

  function mutate(fn: (draft: WorkflowDefinition) => void) {
    const c = clone(wf)
    fn(c)
    setWf(c)
    setDirty(true)
    setStatus('')
  }
  function patchQ(fn: (draft: Question) => void) {
    mutate((c) => fn(c.questions[selected]))
  }

  function TargetSelect({
    value,
    onChange,
    allowContinue,
  }: {
    value: string | undefined
    onChange: (v: string | undefined) => void
    allowContinue?: boolean
  }) {
    return (
      <select
        className="form-input text-sm py-1"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        {allowContinue && <option value="">(continue in order)</option>}
        {targetIds.map((id) => (
          <option key={id} value={id}>{targetLabel(wf, id)}</option>
        ))}
      </select>
    )
  }

  // ── Question-list operations ────────────────────────────────────────────────
  function addQuestion() {
    const id = newQuestionId(new Set(wf.questions.map((x) => x.id)))
    mutate((c) => c.questions.splice(selected + 1, 0, newQuestion(id)))
    setSelected(selected + 1)
  }
  function deleteQuestion() {
    if (wf.questions.length <= 1) return
    if (!confirm(`Delete question "${q.id}"? References to it will need fixing before you can save.`)) return
    mutate((c) => c.questions.splice(selected, 1))
    setSelected(Math.max(0, selected - 1))
  }
  function move(dir: -1 | 1) {
    const j = selected + dir
    if (j < 0 || j >= wf.questions.length) return
    mutate((c) => {
      const [item] = c.questions.splice(selected, 1)
      c.questions.splice(j, 0, item)
    })
    setSelected(j)
  }

  // ── Option operations ───────────────────────────────────────────────────────
  function setOption(i: number, fn: (o: AnswerOption) => void) {
    patchQ((d) => { if (d.options) fn(d.options[i]) })
  }
  function setOptionAction(i: number, patch: Partial<AnswerAction>) {
    patchQ((d) => {
      if (!d.options) return
      const o = d.options[i]
      const a: AnswerAction = { ...(o.action ?? {}), ...patch }
      // Drop empty keys, and drop the action entirely if nothing remains.
      ;(Object.keys(a) as (keyof AnswerAction)[]).forEach((k) => {
        const v = a[k]
        if (v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0)) delete a[k]
      })
      o.action = Object.keys(a).length ? a : undefined
    })
  }

  // ── Branch rules (advanced) ─────────────────────────────────────────────────
  const conditionalRules = (q.next ?? []).filter((r) => r.when)
  const defaultRule = (q.next ?? []).find((r) => !r.when)
  function rebuildNext(cond: typeof conditionalRules, def: string | undefined) {
    patchQ((d) => {
      const rules = [...cond]
      if (def) rules.push({ goto: def })
      d.next = rules.length ? rules : undefined
    })
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function save() {
    setSaving(true)
    setErrors([])
    setStatus('')
    try {
      const res = await fetch('/api/admin/maintenance/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: wf }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors(data.errors ?? [data.error ?? `Save failed (HTTP ${res.status})`])
        return
      }
      setDirty(false)
      setStatus('Saved. The public form now uses this version.')
      // refresh version list
      const g = await fetch('/api/admin/maintenance/workflow')
      if (g.ok) setVersions((await g.json()).versions ?? [])
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Save failed'])
    } finally {
      setSaving(false)
    }
  }

  async function restore(v: VersionRef) {
    if (dirty && !confirm('Discard unsaved changes and load this version?')) return
    try {
      const res = await fetch(v.url, { cache: 'no-store' })
      const data = (await res.json()) as WorkflowDefinition
      setWf(normalizeWorkflow(data))
      setSelected(0)
      setDirty(true)
      setStatus('Loaded a previous version — review and Save to make it active.')
    } catch {
      setErrors(['Could not load that version.'])
    }
  }

  /**
   * Replace the editor's contents with the workflow that ships with the code.
   *
   * Once anything has been saved from this editor, the saved copy wins over the
   * code on the public form — permanently. So when a developer adds a category
   * or reworks a question, this is how that change actually reaches tenants:
   * load the built-in default, review it, Save. Any edits made only in this
   * editor and not mirrored in the code will be lost, hence the confirm.
   */
  function loadBuiltIn() {
    if (!builtIn) return
    if (!confirm(
      'Replace the editor contents with the built-in workflow that ships with the app?\n\n' +
      'Use this to pick up new questions or categories added in the code. Any changes made only ' +
      'here (and not in the code) will be lost. Nothing changes on the public form until you Save.',
    )) return
    setWf(normalizeWorkflow(builtIn))
    setSelected(0)
    setDirty(true)
    setErrors([])
    setStatus(`Loaded the built-in workflow (v${builtIn.version}, ${builtIn.questions.length} questions) — review and Save to make it live.`)
  }

  const isChoice = CHOICE_TYPES.has(q.inputType)
  const builtInIsNewer = !!builtIn && builtIn.version !== wf.version

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <a href="/admin/maintenance" className="text-sm text-primary-500 hover:underline">← Requests</a>
          <div className="flex-1">
            <h1 className="font-heading text-lg font-semibold text-gray-800">Workflow Editor</h1>
            <p className="text-xs text-gray-400">
              {wf.title} · v{wf.version} · {wf.questions.length} questions{dirty && ' · unsaved changes'}
            </p>
          </div>
          {builtIn && (
            <button
              onClick={loadBuiltIn}
              title={`Built-in workflow: v${builtIn.version}, ${builtIn.questions.length} questions`}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Load built-in{builtInIsNewer && <span className="ml-1 text-primary-500">· v{builtIn.version}</span>}
            </button>
          )}
          <button onClick={() => setShowVersions((s) => !s)} className="text-sm text-gray-500 hover:text-gray-800">
            History ({versions.length})
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {(errors.length > 0 || status) && (
          <div className="max-w-6xl mx-auto px-4 pb-3">
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-red-600">• {e}</p>
            ))}
            {status && <p className="text-sm text-green-600">{status}</p>}
          </div>
        )}
        {showVersions && (
          <div className="max-w-6xl mx-auto px-4 pb-3">
            <p className="text-xs text-gray-400 mb-1">Saved versions (newest first)</p>
            {versions.length === 0 && <p className="text-sm text-gray-400">No saved versions yet.</p>}
            <div className="space-y-1 max-h-48 overflow-auto">
              {versions.map((v) => (
                <div key={v.pathname} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{new Date(v.uploadedAt).toLocaleString('en-CA')}</span>
                  <button onClick={() => restore(v)} className="text-primary-500 hover:underline">Load</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        {/* Question list */}
        <aside className="md:sticky md:top-24 md:self-start">
          <button onClick={addQuestion} className="btn-secondary w-full py-2 text-sm mb-3">+ Add question after</button>
          <div className="space-y-1 max-h-[70vh] overflow-auto pr-1">
            {wf.questions.map((qq, i) => (
              <div
                key={qq.id}
                className={`rounded-lg border px-3 py-2 cursor-pointer ${
                  i === selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-300'
                }`}
                onClick={() => setSelected(i)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-5">{i + 1}</span>
                  <span className="flex-1 min-w-0 truncate text-sm text-gray-800">{qq.text}</span>
                  {wf.entry === qq.id && <span className="text-[10px] text-green-600 font-semibold">START</span>}
                </div>
                <p className="text-[10px] text-gray-400 font-mono ml-7 truncate">{qq.id}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Detail */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => move(-1)} disabled={selected === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">↑</button>
              <button onClick={() => move(1)} disabled={selected === wf.questions.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">↓</button>
              <span className="text-xs text-gray-400">Question {selected + 1} of {wf.questions.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => mutate((c) => { c.entry = q.id })}
                disabled={wf.entry === q.id}
                className="text-xs text-primary-500 hover:underline disabled:text-gray-300"
              >
                Set as start
              </button>
              <button onClick={deleteQuestion} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>
          </div>

          <div>
            <Label>Question text</Label>
            <textarea className="form-input" rows={2} value={q.text} onChange={(e) => patchQ((d) => { d.text = e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Question id</Label>
              <input className="form-input font-mono text-sm" value={q.id}
                onChange={(e) => patchQ((d) => { d.id = e.target.value })} />
            </div>
            <div>
              <Label>Input type</Label>
              <select className="form-input" value={q.inputType}
                onChange={(e) => patchQ((d) => { d.inputType = e.target.value as InputType })}>
                {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Section</Label>
              <input className="form-input" list="sections" value={q.section ?? ''}
                onChange={(e) => patchQ((d) => { d.section = e.target.value || undefined })} />
              <datalist id="sections">{SECTIONS.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="flex items-end gap-4 pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!q.optional} onChange={(e) => patchQ((d) => { d.optional = e.target.checked || undefined })} /> Optional
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!q.emergencyBanner} onChange={(e) => patchQ((d) => { d.emergencyBanner = e.target.checked || undefined })} /> Emergency banner
              </label>
            </div>
          </div>

          <div>
            <Label>Help text (optional)</Label>
            <input className="form-input" value={q.helpText ?? ''} onChange={(e) => patchQ((d) => { d.helpText = e.target.value || undefined })} />
          </div>

          {(q.inputType === 'photo' || q.inputType === 'video') && (
            <div className="flex items-center gap-6 border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!q.media?.required}
                  onChange={(e) => patchQ((d) => { d.media = { ...(d.media ?? { required: false }), required: e.target.checked } })} /> Required
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!q.media?.allowUnsafeSkip}
                  onChange={(e) => patchQ((d) => { d.media = { ...(d.media ?? { required: true }), allowUnsafeSkip: e.target.checked } })} /> Allow &quot;unsafe to photograph&quot; skip
              </label>
            </div>
          )}

          {/* Options + per-option routing & priority */}
          {isChoice && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Answer options</Label>
                <button className="text-xs text-primary-500 hover:underline"
                  onClick={() => patchQ((d) => { (d.options ??= []).push({ value: `opt_${(d.options?.length ?? 0) + 1}`, label: 'New option' }) })}>
                  + Add option
                </button>
              </div>
              {q.dynamicOptions ? (
                <p className="text-sm text-gray-500">Options depend on <span className="font-mono">{q.dynamicOptions.basedOn}</span> (edit in code for now).</p>
              ) : (
                <div className="space-y-3">
                  {(q.options ?? []).map((o, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                        <input className="form-input text-sm py-1" value={o.label} placeholder="Label"
                          onChange={(e) => setOption(i, (op) => { op.label = e.target.value })} />
                        <input className="form-input text-sm py-1 font-mono" value={o.value} placeholder="value"
                          onChange={(e) => setOption(i, (op) => { op.value = e.target.value })} />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-400 whitespace-nowrap">Goes to</span>
                        <TargetSelect value={o.goto} allowContinue onChange={(v) => setOption(i, (op) => { op.goto = v })} />
                        <button className="text-xs text-red-400 hover:underline ml-auto"
                          onClick={() => patchQ((d) => { d.options?.splice(i, 1) })}>remove</button>
                      </div>
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">Priority &amp; safety effect{o.action ? ' ✓' : ''}</summary>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <span className="text-xs text-gray-400">Priority</span>
                            <select className="form-input text-sm py-1" value={o.action?.setPriority ?? ''}
                              onChange={(e) => setOptionAction(i, { setPriority: (e.target.value || undefined) as Priority | undefined })}>
                              <option value="">(no change)</option>
                              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">Damage risk</span>
                            <select className="form-input text-sm py-1" value={o.action?.damageRisk ?? ''}
                              onChange={(e) => setOptionAction(i, { damageRisk: (e.target.value || undefined) as DamageRisk | undefined })}>
                              <option value="">(none)</option>
                              {DAMAGE.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-gray-700 col-span-2">
                            <input type="checkbox" checked={!!o.action?.emergency}
                              onChange={(e) => setOptionAction(i, { emergency: e.target.checked })} /> Emergency
                          </label>
                          {o.action?.emergency && (
                            <input className="form-input text-sm py-1 col-span-2" placeholder="Emergency type (e.g. Uncontrolled Water)"
                              value={o.action?.emergencyType ?? ''}
                              onChange={(e) => setOptionAction(i, { emergencyType: e.target.value })} />
                          )}
                          <div className="col-span-2">
                            <span className="text-xs text-gray-400">Safety flags (comma-separated)</span>
                            <input className="form-input text-sm py-1" value={(o.action?.safetyFlags ?? []).join(', ')}
                              onChange={(e) => setOptionAction(i, { safetyFlags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-gray-700 col-span-2">
                            <input type="checkbox" checked={!!o.action?.coordinatorReview}
                              onChange={(e) => setOptionAction(i, { coordinatorReview: e.target.checked })} /> Flag for coordinator review
                          </label>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Branching */}
          <div className="border-t border-gray-100 pt-4">
            <Label>After this question</Label>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Otherwise go to</span>
              <TargetSelect value={defaultRule?.goto} allowContinue
                onChange={(v) => rebuildNext(conditionalRules, v)} />
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Conditional jumps (evaluated first)</span>
                <button className="text-xs text-primary-500 hover:underline"
                  onClick={() => rebuildNext([...conditionalRules, { when: { questionId: q.id, op: 'eq', value: '' }, goto: 'END' }], defaultRule?.goto)}>
                  + Add rule
                </button>
              </div>
              {conditionalRules.map((rule, ri) => {
                const cond = rule.when as Condition
                const updateRule = (patch: Partial<{ cond: Partial<Condition>; goto: string }>) => {
                  const next = conditionalRules.map((r, k) => {
                    if (k !== ri) return r
                    const w = { ...(r.when as Condition), ...(patch.cond ?? {}) }
                    return { when: w, goto: patch.goto ?? r.goto }
                  })
                  rebuildNext(next, defaultRule?.goto)
                }
                return (
                  <div key={ri} className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                    <span className="text-gray-500">if</span>
                    <select className="form-input text-sm py-1 w-40" value={cond.questionId}
                      onChange={(e) => updateRule({ cond: { questionId: e.target.value } })}>
                      {wf.questions.map((x) => <option key={x.id} value={x.id}>{x.id}</option>)}
                    </select>
                    <select className="form-input text-sm py-1" value={cond.op}
                      onChange={(e) => updateRule({ cond: { op: e.target.value as Condition['op'] } })}>
                      {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {cond.op !== 'answered' && cond.op !== 'unanswered' && (
                      <input className="form-input text-sm py-1 w-32" placeholder="value(s)"
                        value={Array.isArray(cond.value) ? cond.value.join(', ') : cond.value ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          const val = cond.op === 'in' || cond.op === 'nin' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : raw
                          updateRule({ cond: { value: val } })
                        }} />
                    )}
                    <span className="text-gray-500">→</span>
                    <TargetSelect value={rule.goto} onChange={(v) => updateRule({ goto: v ?? 'END' })} />
                    <button className="text-xs text-red-400 hover:underline"
                      onClick={() => rebuildNext(conditionalRules.filter((_, k) => k !== ri), defaultRule?.goto)}>remove</button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Visibility */}
          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <input type="checkbox" checked={!!q.visibleIf}
                onChange={(e) => patchQ((d) => { d.visibleIf = e.target.checked ? { questionId: wf.questions[0].id, op: 'eq', value: '' } : undefined })} />
              Only show this question when a condition is met
            </label>
            {q.visibleIf && !('all' in q.visibleIf) && !('any' in q.visibleIf) && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <select className="form-input text-sm py-1 w-40" value={(q.visibleIf as Condition).questionId}
                  onChange={(e) => patchQ((d) => { (d.visibleIf as Condition).questionId = e.target.value })}>
                  {wf.questions.map((x) => <option key={x.id} value={x.id}>{x.id}</option>)}
                </select>
                <select className="form-input text-sm py-1" value={(q.visibleIf as Condition).op}
                  onChange={(e) => patchQ((d) => { (d.visibleIf as Condition).op = e.target.value as Condition['op'] })}>
                  {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className="form-input text-sm py-1 w-32" placeholder="value"
                  value={Array.isArray((q.visibleIf as Condition).value) ? ((q.visibleIf as Condition).value as string[]).join(', ') : ((q.visibleIf as Condition).value as string) ?? ''}
                  onChange={(e) => patchQ((d) => { (d.visibleIf as Condition).value = e.target.value })} />
              </div>
            )}
          </div>

          {/* Safety messages */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Safety messages</Label>
              <button className="text-xs text-primary-500 hover:underline"
                onClick={() => patchQ((d) => { (d.safetyMessages ??= []).push({ text: '', level: 'warning' }) })}>+ Add</button>
            </div>
            {(q.safetyMessages ?? []).map((m, mi) => (
              <div key={mi} className="border border-gray-200 rounded-lg p-2 mb-2">
                <textarea className="form-input text-sm py-1" rows={2} placeholder="Message shown to the tenant" value={m.text}
                  onChange={(e) => patchQ((d) => { d.safetyMessages![mi].text = e.target.value })} />
                <div className="flex items-center gap-3 mt-2">
                  <select className="form-input text-sm py-1 w-32" value={m.level ?? 'warning'}
                    onChange={(e) => patchQ((d) => { d.safetyMessages![mi].level = e.target.value as 'warning' | 'danger' })}>
                    <option value="warning">warning</option>
                    <option value="danger">danger</option>
                  </select>
                  <button className="text-xs text-red-400 hover:underline"
                    onClick={() => patchQ((d) => { d.safetyMessages!.splice(mi, 1); if (!d.safetyMessages!.length) d.safetyMessages = undefined })}>remove</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
