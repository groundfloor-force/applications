# Maintenance Intake — Question Engine

A data-driven, rules-based intake flow. The user answers **one question at a
time**; the next question depends on prior answers. Domain knowledge lives in
**data** (workflow definitions) and **one rules module** (priority/safety) —
never in the UI. This is what lets us add new workflows (e.g. "Clogged Toilet")
without rewriting the engine or the screens.

> **Status:** Stage 3 shipped. The guided intake UI, submission API, photo
> upload, and internal admin view are live at `/maintenance` and
> `/admin/maintenance`. **All nine categories are now guided** — plumbing,
> appliance, HVAC, electrical, doors & locks, walls & ceilings, pests, handyman,
> and a free-text fallback for anything else. Video upload and a queryable
> database remain future work.

## Runtime pieces (Stage 2)

| Path | Responsibility |
|------|----------------|
| `src/app/maintenance/page.tsx` | Public page shell → renders the intake. |
| `src/components/maintenance/MaintenanceIntake.tsx` | Client orchestrator — drives the engine, one screen at a time, sessionStorage resume, review, submit. |
| `src/components/maintenance/QuestionScreen.tsx` | Renders a single question by input type (big buttons, inputs, photo uploader, safety notes, emergency banner). |
| `src/components/maintenance/ReviewScreen.tsx` | Grouped review with per-answer edit + priority/safety badges. |
| `src/lib/maintenance/persistence.ts` | sessionStorage save/load; strips the photo answer (Files can't serialise). |
| `src/app/api/maintenance/route.ts` | Server: **recomputes severity** (never trusts the client), creates the Monday item, uploads photos, posts the Q&A update, fires emergency notifications, defers the property match. |
| `src/app/admin/maintenance/page.tsx` + `src/app/api/admin/maintenance/route.ts` | Internal review view (admin-cookie gated), reads guided requests off the CORE board. |

**Editing on review** uses `reviseAnswer`, which only re-walks/prunes downstream
answers when the new answer actually changes the branch — editing a photo or a
phone number keeps everything else.

## Editable workflow (Vercel Blob)

The bundled `workflows/index.ts` is the **seed/fallback**. At runtime the
app loads the *active* workflow via `getActiveWorkflow()` (`workflow-store.ts`):

- If `BLOB_READ_WRITE_TOKEN` is set and a saved workflow exists in Vercel Blob
  (`maintenance/workflow-active.json`), that is served.
- Otherwise it falls back to the code default — so the form never breaks if Blob
  is unconfigured or a stored blob is corrupt (it's re-validated on read).

`saveActiveWorkflow()` validates (`validate-workflow.ts` — entry exists, unique
ids, every branch/goto/condition resolves) then writes the active blob plus a
timestamped version snapshot under `maintenance/versions/`.

Admin surfaces (admin-cookie gated):
- `/admin/maintenance/workflow` — **full editor**: a question list you can
  reorder / add / delete, plus a per-question panel to edit text, options,
  branching (per-option "goes to" + conditional jumps + default), priority &
  safety effects, visibility, safety messages, and media. Save validates and
  writes a new active version + snapshot; "History" restores older versions.
- `GET/POST /api/admin/maintenance/workflow` — read the active workflow +
  versions; save a validated workflow.

The editor `normalizeWorkflow`s on load — self-referential `when q = value → goto`
rules become per-option `goto`s so routing reads as "choose X → goes to Y". The
result is still a valid WorkflowDefinition (the engine checks option `goto`
first), so it round-trips without a denormalize step.

> Set `BLOB_READ_WRITE_TOKEN` in Vercel (Storage → Blob) to enable saving.
> Without it the editor still loads (code default) but Save returns "not configured".

> ⚠️ **Deploying a code-side workflow change.** Once anything has been saved from
> the editor, the Blob copy wins over the code **forever** — a new category added
> in `workflows/` will not appear on `/maintenance` after deploy. Use the
> **"Load built-in"** button in the editor header to pull the shipped workflow in,
> review it, and Save. The button shows the built-in version number next to it
> when it differs from what is currently live.

## Workflow modules

`workflows/index.ts` is the composition root. Each category is its own module
exporting a `Question[]` and a local id map (the `APPL` pattern):

| Module | Covers |
|--------|--------|
| `selection.ts` | `q_category`, `q_plumbing_type` — the routing hub |
| `water-leak-v1.ts` | The deepest branch: 5 paths off "is water flowing right now" |
| `appliance-v1.ts` | 5 appliances, shared leak/noise sub-flows |
| `hvac-v1.ts` | Heating & cooling, incl. CO/gas hazard stop |
| `electrical-v1.ts` | Fire/shock/water hazards, outages, breakers |
| `plumbing-v1.ts` | Clogs, no water / no hot water, pressure, broken fixtures |
| `door-lock-v1.ts` | Doors, locks, entry, security |
| `walls-ceilings-v1.ts` | Ceilings, walls, floors, mold |
| `pest-v1.ts` | Rodents, bedbugs, insects |
| `handyman-v1.ts` | Small jobs and scheduling |
| `shared-tail.ts` | `q_issue_detail`, `q_fallback_desc`, then media → contact → property → access → comments |
| `shared.ts` | `opt()`, `YES_NO`, `TRADE` |

### Module contract

The engine falls through to the **next question in array order** when nothing
else matches — `tailQuestions` depends on that. So:

1. Array-order fallthrough is legal only **within** a module.
2. Every question in a module appended **after** `tailQuestions` must have an
   explicit terminal route. A category module's last question should `goto`
   `QID.ISSUE_DETAIL` (which itself goes to `QID.MEDIA`).
3. A question with `visibleIf` is routed through **without an answer** when it is
   skipped, so its option `goto`s never fire — it must have an unconditional
   `next` rule.
4. Inside one question, an option `value` reused across `dynamicOptions.map`
   entries must carry the **same** `action` — `findOption` in `priority-rules.ts`
   returns the first value match across every map. Prefix per-branch values
   (`heat_unsafe`, `cool_hot`) when the actions differ.

`__tests__/workflow-structure.test.ts` enforces all four, plus a snapshot of the
composed question order and a table test that drives **every** `q_category` and
`q_plumbing_type` option through to completion.

### Cross-module handoffs

Two flows deliberately jump into the leak module rather than duplicating it:

- broken fixture → "it is leaking" → `q_water_flow` (the full leak tree)
- wall/ceiling water stain or sagging → `q_damage_location` (the damage branch)

`buildSummary` is gated on `q_water_flow || q_damage_location` rather than on the
category, so both handoffs still produce the good leak prose.

### Triage principles worth keeping

- **Season is an answer, not a clock.** "No heat" is P1 only when the occupant
  says it is unsafely cold or that pipes may freeze (`q_hvac_severity`). The
  engine never needs a date, and severity stays deterministic.
- **Escalate on consequence, not symptom.** A broken lock is P1 on a main entry
  door and P3 on a closet door — `q_door_secure` asks the question the symptom
  cannot answer. Same shape for `q_clog_sole_toilet` and `q_wall_safety`.
- **Hazards short-circuit.** Gas, CO, smoke, sparks, shock, sewage and
  uncontrolled water all `goto` a stop screen and then straight to photos +
  contact. Never run someone through diagnostics during an emergency.
- **`suggestedTrade` is last-wins.** An option that names a trade suppresses the
  `water_near_electrical` → "Plumber + Electrician" override, which is why
  `q_elec_problem`'s water option deliberately names none.

### The free-text fallback

`q_fallback_desc` is now reached **only** via the unconditional default rules on
`q_category` / `q_plumbing_type`. That makes it two things at once: a safe landing
spot when an admin adds an option in the editor without wiring routing, and a
**coverage metric** — any submission whose `qaHistory` contains it is a gap in the
guided intake worth building out.

## Priority is data (editable)

Severity is no longer hardcoded. Each answer OPTION carries an optional `action`
(`setPriority`, `emergency`/`emergencyType`, `safetyFlags`, `damageRisk`,
`coordinatorReview`). `evaluateSeverity(answers, workflow)` merges the actions of
every chosen option — most-severe priority wins, flags union, emergency type
from the earliest emergency in the flow — so editing an option's effect in the
admin changes the computed priority. `suggestedTrade` falls back to a per-category
`BASE_TRADE` table in code; an option's `suggestedTrade` overrides it (last set
wins, and it is applied *after* the `water_near_electrical` override).

Safety-flag strings live in `FLAG` (`ids.ts`) because several are set from more
than one module — `water_near_electrical` comes from the leak tree, the appliance
flow *and* the electrical flow.

**Emergency notify:** P1 submissions call `safeNotify([logProvider, emailProvider])`.
Email goes to `MAINTENANCE_EMERGENCY_EMAIL` (falls back to `NOTIFICATION_EMAIL`);
without `RESEND_API_KEY` it no-ops. A notify failure never blocks the request.

## Files

| File | Responsibility |
|------|----------------|
| `types.ts` | All engine/workflow types. |
| `ids.ts` | Canonical question ids, answer values, and `FLAG` safety-flag names. |
| `sections.ts` | The one section list — progress bar, review grouping, admin picker. |
| `conditions.ts` | `evalPredicate` — evaluates a serialisable condition over answers. |
| `engine.ts` | Generic engine: start, answer, back, edit, branching, pruning, history, (de)serialise. Domain-agnostic. |
| `priority-rules.ts` | `evaluateSeverity(answers)` — the **only** place priority/emergency/safety is decided. |
| `media-validation.ts` | Pure file-type/size checks (photos only in v1). |
| `notifications.ts` | Provider-agnostic emergency notifications; `safeNotify` never throws. |
| `request.ts` | `buildRequestPayload` + `buildSummary` — the structured output. |
| `validate-workflow.ts` | Structural validation before persisting — resolves every `goto` (static **and** dynamic), condition, and `visibleIf`. |
| `workflows/` | The workflow **data**, one module per category. See above. |
| `__tests__/` | Vitest scenario tests. Run with `npm test`. |

## How the engine works

A `WorkflowDefinition` is `{ id, version, entry, questions[] }`. The engine
tracks an `EngineState` (plain JSON, so it survives a refresh):

```
startSession(wf) → answer(wf, state, value) → … → state.completed === true
```

Each `answer()` call:
1. Validates the value for the current question.
2. Records the answer + display label.
3. If the value **changed**, prunes every downstream answer (an abandoned
   branch can never leak into the result).
4. Evaluates branching to pick the next **visible** question (or `END`).

`goBack` returns to the previous question (answer kept for prefill).
`editAnswer(wf, state, questionId)` jumps back to any answered question and
clears everything after it (used by the review screen's "edit").

## How branching works

The next question is chosen in this order:

1. The chosen option's `goto`, if set.
2. The first `next` rule whose `when` predicate matches (a rule with no `when`
   is the unconditional default).
3. Otherwise the **next question in array order** — this keeps the long linear
   "shared tail" (contact → property → access → comments) terse.

Questions with a `visibleIf` predicate that evaluates false are skipped
automatically (e.g. `q_pet_details` only appears when `q_pets === 'yes'`).

## How conditions work

A `Predicate` is either a `Condition` (`{ questionId, op, value }` with op
`eq | neq | in | nin | answered | unanswered`) or a `ConditionGroup`
(`{ all: [...] }` / `{ any: [...] }`). They are plain data, so they serialise
and are trivially testable.

## How "actions" work

Rather than scattering imperative actions, effects are **derived**:

- **Safety messages** are declared on the question (`safetyMessages[]`, each with
  an optional `when`). The UI shows the ones whose predicate matches.
- **Media requirements** are declared on the question (`media`).
- **Priority, emergency status, safety flags, damage risk, suggested trade, and
  response time** are all computed by `evaluateSeverity(answers)` — see below.

## How priority is calculated

`priority-rules.ts` merges the `action`s of every chosen option and returns a
`Severity`. The client calls it for the live emergency banner; **the server
re-runs it at submit time and never trusts a client-supplied priority.**

Merge rules (deterministic): most-severe `setPriority` wins · the earliest
`emergencyType` in workflow order wins · `safetyFlags` union · highest
`damageRisk` wins · `coordinatorReview` is sticky · `suggestedTrade` is last-set-
wins over the category's `BASE_TRADE`, applied after the `water_near_electrical`
override.

What earns a **P1** today, across all modules: uncontrolled water · water near
electrical · gas smell · CO alarm · smoke, sparks or scorch marks · electric
shock · overheating appliance · no heat that is unsafely cold or risks freezing
pipes · suspected frozen pipes · sewage backup · overflowing drain · ceiling
collapse · injury · a unit that cannot be locked · break-in damage.

## Adding to the flow

**Add a question:** append a `Question` to the relevant module's array. Put its
id in that module's local id map (`APPL`, `HVACQ`, `ELEC`, …) unless it is
genuinely cross-module, which belongs in `ids.ts`. Honour the module contract
above — anything after `tailQuestions` needs an explicit terminal route.

**Add an answer option:** add an `AnswerOption` (`{ value, label }`) to the
question's `options` (or `dynamicOptions`). Keep `value` stable — history and
severity reference it.

**Add a safety message:** push to the question's `safetyMessages[]` with a
`when` predicate.

**Change priority behaviour:** edit the option's `action` in the workflow data,
or the `BASE_TRADE` table in `priority-rules.ts`. Nothing else.

## Adding a new category

1. Create `workflows/<name>-v1.ts` exporting `<name>Questions: Question[]` and a
   local id map. Follow `pest-v1.ts` — it is the smallest complete example.
2. End the flow with `next: [{ goto: QID.ISSUE_DETAIL }]`.
3. Add the value to `CATEGORY` in `ids.ts` and an option with a `goto` in
   `selection.ts`.
4. Spread the module into `maintenanceIntakeWorkflow.questions` in
   `workflows/index.ts`, **after** `tailQuestions`, and add it to
   `CATEGORY_PRIMARY_QUESTIONS` so the summary and issue type read well.
5. Add a `BASE_TRADE` entry in `priority-rules.ts`.
6. Extend `EXPECTED_ORDER` in `workflow-structure.test.ts` and add a
   `<name>.test.ts` covering each priority outcome and each skippable question.
7. Bump the workflow `version`, deploy, then **Load built-in → Save** in the
   admin editor (see the warning above) or the change stays invisible.

## Testing

`npm test` (Vitest), 100 tests across 12 files:

| File | Covers |
|------|--------|
| `workflow-structure.test.ts` | **Start here.** `validateWorkflow`, the composed question-order snapshot, unique ids, known sections, the skippable-question contract, and a table test driving every `q_category` / `q_plumbing_type` option to completion. |
| `engine.test.ts` | Back-nav, downstream pruning, refresh-resume, `reviseAnswer` keep-vs-prune, `visibleIf` skipping. |
| `priority-rules.test.ts` | Leak priority outcomes, safety messages, the `BASE_TRADE` table (which also asserts every category has one). |
| `hvac` / `electrical` / `plumbing` / `appliance` / `doors-walls-handyman-pest` | Per-category triage: each P1/P2/P3 outcome, each hazard short-circuit, each skippable question. |
| `request.test.ts` | What the coordinator reads — issue type, summary, description, emergency line. |
| `media-and-notify.test.ts` | Media rejection; a failed notify provider never blocks creation. |

When adding a category, the structure test catches routing mistakes and the
per-category test catches triage mistakes. You want both.

## Emergency notifications

`safeNotify(providers, notification)` fans out to every provider and **never
throws** — a provider failure is logged and returned as an outcome, but request
creation always proceeds. v1 ships a `logProvider`; email/webhook/SMS providers
plug in without touching the submission flow.
