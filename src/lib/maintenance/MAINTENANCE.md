# Maintenance Intake — Question Engine

A data-driven, rules-based intake flow. The user answers **one question at a
time**; the next question depends on prior answers. Domain knowledge lives in
**data** (workflow definitions) and **one rules module** (priority/safety) —
never in the UI. This is what lets us add new workflows (e.g. "Clogged Toilet")
without rewriting the engine or the screens.

> **Status:** Stage 2 shipped. The guided intake UI, submission API, photo
> upload, and internal admin view are live at `/maintenance` and
> `/admin/maintenance`. Video upload and a queryable database remain future work.

## Runtime pieces (Stage 2)

| Path | Responsibility |
|------|----------------|
| `src/app/maintenance/page.tsx` | Public page shell → renders the intake. |
| `src/components/maintenance/MaintenanceIntake.tsx` | Client orchestrator — drives the engine, one screen at a time, localStorage resume, review, submit. |
| `src/components/maintenance/QuestionScreen.tsx` | Renders a single question by input type (big buttons, inputs, photo uploader, safety notes, emergency banner). |
| `src/components/maintenance/ReviewScreen.tsx` | Grouped review with per-answer edit + priority/safety badges. |
| `src/lib/maintenance/persistence.ts` | localStorage save/load; strips the photo answer (Files can't serialise). |
| `src/app/api/maintenance/route.ts` | Server: **recomputes severity** (never trusts the client), creates the Monday item, uploads photos, posts the Q&A update, fires emergency notifications, defers the property match. |
| `src/app/admin/maintenance/page.tsx` + `src/app/api/admin/maintenance/route.ts` | Internal review view (admin-cookie gated), reads guided requests off the CORE board. |

**Editing on review** uses `reviseAnswer`, which only re-walks/prunes downstream
answers when the new answer actually changes the branch — editing a photo or a
phone number keeps everything else.

**Emergency notify:** P1 submissions call `safeNotify([logProvider, emailProvider])`.
Email goes to `MAINTENANCE_EMERGENCY_EMAIL` (falls back to `NOTIFICATION_EMAIL`);
without `RESEND_API_KEY` it no-ops. A notify failure never blocks the request.

## Files

| File | Responsibility |
|------|----------------|
| `types.ts` | All engine/workflow types. |
| `ids.ts` | Canonical question ids + answer values (shared by config & rules). |
| `conditions.ts` | `evalPredicate` — evaluates a serialisable condition over answers. |
| `engine.ts` | Generic engine: start, answer, back, edit, branching, pruning, history, (de)serialise. Domain-agnostic. |
| `priority-rules.ts` | `evaluateSeverity(answers)` — the **only** place priority/emergency/safety is decided. |
| `media-validation.ts` | Pure file-type/size checks (photos only in v1). |
| `notifications.ts` | Provider-agnostic emergency notifications; `safeNotify` never throws. |
| `request.ts` | `buildRequestPayload` + `buildSummary` — the structured output. |
| `workflows/water-leak-v1.ts` | The workflow **data**. |
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

`priority-rules.ts` is the single source of truth. It reads well-known answers
(water status, near-electrical, leak amount, ceiling risk, …) and returns a
`Severity`. The client calls it for the live emergency banner; **the server
re-runs it at submit time and never trusts a client-supplied priority.**

Rules (deterministic):

- Uncontrolled water → **P1**, emergency, `Uncontrolled Water`.
- Water near electrical (Yes) → **P1**, emergency, flag `water_near_electrical`.
- Contained water / hidden damage / ceiling risk / large "when used" leak →
  **P2**.
- Small "when used" leak / slow drip → **P3**.
- "Cannot safely inspect" → ≥ **P2** + `coordinatorReview`.

## Adding to the flow

**Add a question:** append a `Question` to the workflow's `questions[]` and add
its id to `ids.ts`. If it belongs in the linear tail, array order handles the
routing; otherwise wire `next`/`goto`.

**Add an answer option:** add an `AnswerOption` (`{ value, label }`) to the
question's `options` (or `dynamicOptions`). Keep `value` stable — rules and
history reference it.

**Add a safety message:** push to the question's `safetyMessages[]` with a
`when` predicate.

**Change priority behaviour:** edit `priority-rules.ts` only.

## Adding a new workflow — "Clogged Toilet" example

1. In `ids.ts`, add the new ids/values you need (e.g. `CLOG_SEVERITY`, values
   `overflowing | draining_slow | fully_blocked`).
2. Create `workflows/clogged-toilet-v1.ts` exporting a `WorkflowDefinition`.
   Reuse the shared-tail questions (extract them to a shared module when the
   second workflow lands). Sketch:

   ```ts
   {
     id: 'q_clog_overflowing',
     text: 'Is the toilet overflowing right now?',
     inputType: 'single_choice',
     options: [opt('yes', 'Yes'), opt('no', 'No')],
     next: [
       { when: { questionId: 'q_clog_overflowing', op: 'eq', value: 'yes' }, goto: QID.MEDIA },
       { goto: 'q_clog_other_toilet' },
     ],
   }
   ```
3. In `priority-rules.ts`, add a rule: overflowing toilet → P2 (or P1 if it is
   the only toilet and actively overflowing). Everything else — navigation,
   validation, history, summary, review — works unchanged.
4. Add a `clogged-toilet.test.ts` mirroring the scenarios below.

## Testing a workflow

`npm test` (Vitest). The suite covers the 12 required scenarios: priority
outcomes (P1/P2/P3), safety flags, back-navigation, downstream pruning,
refresh-resume, notification-failure isolation, media rejection, and a basic
non-plumbing submission. Add equivalent cases for each new workflow.

## Emergency notifications

`safeNotify(providers, notification)` fans out to every provider and **never
throws** — a provider failure is logged and returned as an outcome, but request
creation always proceeds. v1 ships a `logProvider`; email/webhook/SMS providers
plug in without touching the submission flow.
