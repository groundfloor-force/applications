# Notices Page (Notice to Vacate) — Design

Date: 2026-07-23
Status: Approved (Tony, via chat) — pending visual review on local dev server before deploy.

## Purpose

Add a `/notices` page so tenants can submit a Notice to Vacate through the web app
instead of the Monday form (https://forms.monday.com/forms/f60792d8402588bbda85be63e6a45c2e).
Mirrors the pattern of the existing Support page. Submissions create items on the
Monday "2. Notices" board (442889260).

## Decisions (from brainstorming)

- **Address entry:** searchable unit picker backed by the Rentvine Units board
  (18355167955, 1,414 items, Active group only). Selection auto-links the
  `board_relation_mm1jz4k6` column so staff don't need the "Auto-Link Unit" button.
- **Forwarding address:** stored in a new plain-text column on the Notices board
  (the existing `location_mm54rmqq` location column needs lat/lng geocoding — skipped).
  Postal code goes to existing `text_mm546cmt`.
- **Move-out date:** last-day-of-month rule is shown as a warning only; any date accepted.
- **Form style:** single-page form like Support — no wizard, no draft persistence.

## UI — `/notices`

Same shell as Support (logo header, footer, brand styles, no pills, full-width form column).
Fields in Monday-form order:

1. Your address — searchable unit picker (required). Type-to-filter dropdown over active units.
2. Requested move-out date (required) — DateInput; warning text: must be the last day
   of the month, not the 1st.
3. Full name (required), Email (required).
4. Reason for moving out (required) — 7 tenant-visible options in form order:
   Moving out of City/Province/Country · Purchased a home · Need more space ·
   Need less space · Rent price/Rent Increase · Separation/Roommate Issues ·
   Other - please provide reason below.
5. Additional details of notice — textarea; required only when reason is "Other".
6. Forwarding address + Forwarding postal code — optional; hint explains it's for
   security-deposit remittance.
7. Are all occupants moving out? — Yes - All occupants are moving out ·
   No - My roommate wishes to keep the apartment · Other - Please provide more details below.
   Plus optional "More details on roommate(s)" text field.
8. Signature (required) — existing SignaturePad component.

Success screen mirrors Support's.

## API

### GET /api/units
Returns `{ units: [{ id, name }] }` for Active-group units from board 18355167955.
Cursor-paginated fetch (500/page), 5-minute in-memory cache per lambda (same pattern
as vacancies). Client fetches once and filters locally.

### POST /api/notices
Multipart: `data` JSON + signature handled as data URL inside JSON (like applications).
Validates required fields server-side. Creates item on board 442889260, group `topics`
(Unprocessed):

| Column | Value |
|---|---|
| item name | `{unit name} - {full name}` (≤255) |
| date8 Created | today |
| status | `*NEW` |
| type | `Move Out` |
| date Move Out Date | submitted date |
| text0 / text2 | tenant name / email |
| dropdown__1 | reason label |
| long_text Notice | additional details |
| dropdown_mm544ttk | occupants label |
| text_mm542y9p | roommate details |
| text5 / text00 | address / unit parsed from unit name ("addr - unit") |
| board_relation_mm1jz4k6 | picked unit item id |
| text_mm546cmt | forwarding postal code |
| (new text column) Forwarding Address | forwarding address |

Then uploads the signature PNG to the `signature` file column via `uploadFileToMonday`.
Stage-logged like the support route; signature upload failure must not lose the item
(item id still returned).

## Error handling

- Client: per-field validation before submit; server error surfaced with requestId ref.
- Server: 400 on missing/invalid fields; 502 with requestId on Monday failures.

## Testing

- Vitest: validation rules and column-value payload mapping (unit name parsing,
  conditional "Other" requirement).
- tsc + production build.
- One live E2E submission to the board, verified then deleted.

## Rollout

Build → local review on `npm run dev` (localhost:3000/notices) → Tony approves →
push to main (Vercel auto-deploy).
