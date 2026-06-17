import Anthropic from '@anthropic-ai/sdk'

// Documents we can send to Claude with vision/document support.
const SUPPORTED_IMAGE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
const SUPPORTED_PDF = 'application/pdf'

// 2.5x is the minimum, 3x is the comfortable band.
export const RATIO_PASS = 3.0
export const RATIO_MIN = 2.5

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'unknown'
export type DocumentKind = 'pay_stub' | 'bank_statement' | 'employment_letter' | 'other'
export type RatioBand = 'pass' | 'borderline' | 'fail' | 'unknown'

// Raw structured output we ask Claude to return for each document.
interface ExtractedDoc {
  documentType: DocumentKind
  applicantName: string | null
  employer: string | null
  payPeriodStart: string | null   // ISO date
  payPeriodEnd: string | null     // ISO date
  payFrequency: PayFrequency
  grossThisPeriod: number | null
  grossYTD: number | null
  confidence: number              // 0..1
  notes: string | null
}

export interface DocumentResult {
  fileName: string
  ownerLabel: string              // who uploaded it ("Primary", occupant name, "Co-signer")
  isOwnerPrimary: boolean
  isCosigner: boolean
  extracted: ExtractedDoc | null  // null if parse failed
  monthlyGross: number | null     // computed from extracted
  error?: string
}

export interface ApplicantSummary {
  label: string
  isPrimary: boolean
  selfReportedMonthly: number | null
  documentedMonthly: number       // best estimate across docs
  documents: DocumentResult[]
  mismatchFlag: boolean           // self-reported vs documented diverge >25%
}

export interface VerificationResult {
  ran: boolean
  reason?: string                 // when ran=false (e.g. no key, no docs)
  monthlyRent: number
  applicants: ApplicantSummary[]
  cosigner: ApplicantSummary | null
  householdMonthly: number        // sum of applicants (not cosigner)
  ratio: number                   // householdMonthly / monthlyRent
  band: RatioBand
  unparsed: DocumentResult[]
  totalDocuments: number
}

// ───────────────────────────────────────────────────────────────────────────
// Public entry point
// ───────────────────────────────────────────────────────────────────────────

export interface VerificationInput {
  monthlyRent: number
  primary: {
    label: string
    selfReportedMonthly: number | null
    documents: { fileName: string; buffer: Buffer; mimeType: string }[]
  }
  occupants: {
    label: string
    selfReportedMonthly: number | null
    documents: { fileName: string; buffer: Buffer; mimeType: string }[]
  }[]
  cosigner: {
    label: string
    documents: { fileName: string; buffer: Buffer; mimeType: string }[]
  } | null
}

export async function runIncomeVerification(input: VerificationInput): Promise<VerificationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return emptyResult(input.monthlyRent, 'ANTHROPIC_API_KEY not set')
  }

  const allDocs = [
    ...input.primary.documents.length > 0 ? [{ kind: 'primary' as const, list: input.primary.documents }] : [],
    ...input.occupants.flatMap((o, i) => o.documents.length > 0 ? [{ kind: 'occupant' as const, index: i, list: o.documents }] : []),
    ...(input.cosigner && input.cosigner.documents.length > 0 ? [{ kind: 'cosigner' as const, list: input.cosigner.documents }] : []),
  ]

  if (allDocs.length === 0) {
    return emptyResult(input.monthlyRent, 'No documents uploaded')
  }

  const client = new Anthropic({ apiKey })

  const extractAll = async (
    docs: { fileName: string; buffer: Buffer; mimeType: string }[],
    ownerLabel: string,
    isOwnerPrimary: boolean,
    isCosigner: boolean,
  ): Promise<DocumentResult[]> => {
    const results: DocumentResult[] = []
    for (const doc of docs) {
      const r = await extractOne(client, doc, ownerLabel, isOwnerPrimary, isCosigner)
      results.push(r)
    }
    return results
  }

  const primaryDocs = await extractAll(
    input.primary.documents, input.primary.label, true, false,
  )

  const occupantDocResults = await Promise.all(
    input.occupants.map((o) => extractAll(o.documents, o.label, false, false)),
  )

  const cosignerDocs = input.cosigner
    ? await extractAll(input.cosigner.documents, input.cosigner.label, false, true)
    : []

  // Aggregate into applicants
  const primarySummary: ApplicantSummary = summarize(
    input.primary.label, true, input.primary.selfReportedMonthly, primaryDocs,
  )

  const occupantSummaries: ApplicantSummary[] = input.occupants.map((o, i) =>
    summarize(o.label, false, o.selfReportedMonthly, occupantDocResults[i] ?? []),
  )

  const cosignerSummary: ApplicantSummary | null = input.cosigner
    ? summarize(input.cosigner.label, false, null, cosignerDocs)
    : null

  const applicants = [primarySummary, ...occupantSummaries]
  const householdMonthly = applicants.reduce((sum, a) => sum + a.documentedMonthly, 0)
  const ratio = input.monthlyRent > 0 ? householdMonthly / input.monthlyRent : 0
  const band = bandFor(ratio, householdMonthly)

  const allResults = [
    ...primaryDocs,
    ...occupantDocResults.flat(),
    ...cosignerDocs,
  ]
  const unparsed = allResults.filter((d) => d.monthlyGross == null)

  return {
    ran: true,
    monthlyRent: input.monthlyRent,
    applicants,
    cosigner: cosignerSummary,
    householdMonthly,
    ratio,
    band,
    unparsed,
    totalDocuments: allResults.length,
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Per-document extraction via Claude
// ───────────────────────────────────────────────────────────────────────────

async function extractOne(
  client: Anthropic,
  doc: { fileName: string; buffer: Buffer; mimeType: string },
  ownerLabel: string,
  isOwnerPrimary: boolean,
  isCosigner: boolean,
): Promise<DocumentResult> {
  const mime = doc.mimeType.toLowerCase()

  // We can't read DOCX/HEIC directly. Surface as unparsed so the PM knows.
  if (!SUPPORTED_IMAGE.has(mime) && mime !== SUPPORTED_PDF) {
    return {
      fileName: doc.fileName,
      ownerLabel,
      isOwnerPrimary,
      isCosigner,
      extracted: null,
      monthlyGross: null,
      error: `Unsupported format: ${mime || 'unknown'}`,
    }
  }

  const base64 = doc.buffer.toString('base64')
  const contentBlock: Anthropic.ContentBlockParam =
    mime === SUPPORTED_PDF
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: base64 } }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    })

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('\n')

    const extracted = parseJsonResponse(text)
    if (!extracted) {
      return {
        fileName: doc.fileName, ownerLabel, isOwnerPrimary, isCosigner,
        extracted: null, monthlyGross: null, error: 'Could not parse JSON response',
      }
    }

    const monthly = monthlyGrossFromExtracted(extracted)
    return {
      fileName: doc.fileName, ownerLabel, isOwnerPrimary, isCosigner,
      extracted, monthlyGross: monthly,
    }
  } catch (err) {
    return {
      fileName: doc.fileName, ownerLabel, isOwnerPrimary, isCosigner,
      extracted: null, monthlyGross: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Monthly gross normalization
// ───────────────────────────────────────────────────────────────────────────

// Frequency-correct multipliers from a single pay period's gross to monthly.
// Bi-weekly is 26 paychecks/year, so monthly = period × 26 / 12. Semi-monthly
// is exactly 24/year = period × 2.
const PERIOD_TO_MONTHLY: Record<PayFrequency, number | null> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
  unknown: null,
}

function monthlyGrossFromExtracted(e: ExtractedDoc): number | null {
  // Only pay stubs give us reliable income info — other doc types we skip.
  if (e.documentType !== 'pay_stub') return null
  if (e.confidence < 0.4) return null

  const period = e.grossThisPeriod && e.grossThisPeriod > 0 ? e.grossThisPeriod : null
  const ytd = e.grossYTD && e.grossYTD > 0 ? e.grossYTD : null
  const monthsElapsed = monthsElapsedAt(e.payPeriodEnd)
  const ytdMonthly = ytd && monthsElapsed && monthsElapsed > 0 ? ytd / monthsElapsed : null

  const periodMultiplier = PERIOD_TO_MONTHLY[e.payFrequency]
  const periodMonthly = period && periodMultiplier ? period * periodMultiplier : null

  // Prefer YTD-based estimate when both are available — it smooths OT spikes
  // and sign-on bonuses. Cross-check: if they diverge by >25%, average them
  // and the caller will see the discrepancy in confidence.
  if (ytdMonthly && periodMonthly) {
    const ratio = Math.max(ytdMonthly, periodMonthly) / Math.max(1, Math.min(ytdMonthly, periodMonthly))
    if (ratio > 1.25) {
      // Big divergence — fall back to YTD as the more reliable signal.
      return roundCents(ytdMonthly)
    }
    return roundCents((ytdMonthly + periodMonthly) / 2)
  }

  if (ytdMonthly) return roundCents(ytdMonthly)
  if (periodMonthly) return roundCents(periodMonthly)
  return null
}

function monthsElapsedAt(isoDate: string | null): number | null {
  if (!isoDate) return null
  try {
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return null
    // Decimal months from Jan 1 of the same year through the period end.
    const dayOfYear = (d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000
    return Math.max(0.5, dayOfYear / 30.4375)
  } catch {
    return null
  }
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100
}

// ───────────────────────────────────────────────────────────────────────────
// Aggregation + ratio banding
// ───────────────────────────────────────────────────────────────────────────

function summarize(
  label: string,
  isPrimary: boolean,
  selfReportedMonthly: number | null,
  documents: DocumentResult[],
): ApplicantSummary {
  // Best estimate per applicant: take the max documented monthly across pay
  // stubs (in case there are stubs from two employers, we'd sum — but we
  // can't tell from a single field whether they're the same job. For now,
  // pay stubs from the same uploader are assumed to be the same job and we
  // take the most recent / highest, treating duplicates as overlapping.
  // This is a conservative call — a single applicant with two jobs should
  // be flagged for manual review.
  const monthlies = documents
    .map((d) => d.monthlyGross)
    .filter((v): v is number => v != null && v > 0)

  // If multiple pay stubs from the same employer, prefer the highest (most
  // recent / OT-inclusive). If they look like different employers we sum.
  let documentedMonthly = 0
  if (monthlies.length > 0) {
    const employers = new Set(
      documents
        .map((d) => d.extracted?.employer?.toLowerCase().trim())
        .filter((e): e is string => !!e),
    )
    documentedMonthly = employers.size > 1
      ? monthlies.reduce((a, b) => a + b, 0)
      : Math.max(...monthlies)
  }

  const mismatchFlag = selfReportedMonthly != null && documentedMonthly > 0
    ? Math.abs(selfReportedMonthly - documentedMonthly) / Math.max(selfReportedMonthly, documentedMonthly) > 0.25
    : false

  return {
    label, isPrimary, selfReportedMonthly,
    documentedMonthly: roundCents(documentedMonthly),
    documents, mismatchFlag,
  }
}

function bandFor(ratio: number, householdMonthly: number): RatioBand {
  if (householdMonthly === 0) return 'unknown'
  if (ratio >= RATIO_PASS) return 'pass'
  if (ratio >= RATIO_MIN) return 'borderline'
  return 'fail'
}

function emptyResult(monthlyRent: number, reason: string): VerificationResult {
  return {
    ran: false, reason, monthlyRent,
    applicants: [], cosigner: null,
    householdMonthly: 0, ratio: 0, band: 'unknown',
    unparsed: [], totalDocuments: 0,
  }
}

// ───────────────────────────────────────────────────────────────────────────
// LLM prompts
// ───────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an income-verification assistant for a property management company in Canada. You will be shown a single document uploaded by a rental applicant. Extract structured data and return ONLY valid JSON — no preamble, no markdown fences.

If the document is not a pay stub, set documentType accordingly and leave income fields null. Be conservative about confidence — only set above 0.7 when you can clearly read the gross amount and pay period.

Canadian pay stubs typically show: employee name, employer, pay period start/end, pay frequency (often shown as "Bi-weekly", "Semi-monthly", etc.), gross pay for the period, deductions, net pay, and year-to-date (YTD) totals.

Distinguish carefully:
- "Bi-weekly" = every 2 weeks = 26/year
- "Semi-monthly" = twice a month = 24/year
These are different — bi-weekly pays slightly more per month.`

const USER_PROMPT = `Return JSON in this exact shape (no other text):
{
  "documentType": "pay_stub" | "bank_statement" | "employment_letter" | "other",
  "applicantName": string | null,
  "employer": string | null,
  "payPeriodStart": "YYYY-MM-DD" | null,
  "payPeriodEnd": "YYYY-MM-DD" | null,
  "payFrequency": "weekly" | "biweekly" | "semimonthly" | "monthly" | "unknown",
  "grossThisPeriod": number | null,
  "grossYTD": number | null,
  "confidence": number,
  "notes": string | null
}

Numbers must be plain numbers (no dollar signs, no commas). If a value is unclear, set it to null rather than guessing.`

// ───────────────────────────────────────────────────────────────────────────
// Monday update formatter
// ───────────────────────────────────────────────────────────────────────────

// Kayla's Monday user ID — same constant used elsewhere for tagging on
// new applications. Duplicated here so this module stays self-contained
// and importable from background jobs.
const KAYLA_USER_ID = 24655178

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function formatVerificationUpdate(result: VerificationResult): string {
  if (!result.ran) {
    return `<p><b>📋 Income verification skipped</b></p><p><i>${escapeHtml(result.reason || 'Unknown reason')}</i></p>`
  }

  const bandEmoji = result.band === 'pass' ? '🟢'
    : result.band === 'borderline' ? '🟡'
    : result.band === 'fail' ? '🔴'
    : '⚪'
  const bandLabel = result.band === 'pass' ? 'Passes affordability'
    : result.band === 'borderline' ? 'Borderline'
    : result.band === 'fail' ? 'Below threshold'
    : 'Insufficient data'

  const ratioStr = result.householdMonthly > 0
    ? `${result.ratio.toFixed(2)}× rent`
    : 'N/A'

  const lines: string[] = []
  lines.push(`<p><b>${bandEmoji} Income verification — ${escapeHtml(bandLabel)}</b></p>`)
  lines.push(`<p><b>Household monthly:</b> ${formatMoney(result.householdMonthly)} &nbsp;·&nbsp; <b>Rent:</b> ${formatMoney(result.monthlyRent)} &nbsp;·&nbsp; <b>Ratio:</b> ${ratioStr}</p>`)
  lines.push(`<p><i>Threshold: ≥3× passes, 2.5–3× borderline, &lt;2.5× below.</i></p>`)

  // Per-applicant breakdown table
  lines.push(`<p><b>Per applicant:</b></p>`)
  lines.push(`<ul>`)
  for (const a of result.applicants) {
    const docCount = a.documents.length
    const parsedCount = a.documents.filter((d) => d.monthlyGross != null).length
    const docNote = docCount === 0
      ? '<i>no documents</i>'
      : parsedCount < docCount
        ? `${parsedCount} of ${docCount} parsed`
        : `${parsedCount} doc${parsedCount === 1 ? '' : 's'}`

    let line = `<b>${escapeHtml(a.label)}${a.isPrimary ? ' (primary)' : ''}:</b> documented ${formatMoney(a.documentedMonthly)}/mo`
    if (a.selfReportedMonthly != null) {
      line += ` &nbsp;·&nbsp; self-reported ${formatMoney(a.selfReportedMonthly)}/mo`
      if (a.mismatchFlag) {
        line += ` &nbsp;⚠️ <b>mismatch &gt;25%</b>`
      }
    }
    line += ` &nbsp;·&nbsp; <i>${docNote}</i>`
    lines.push(`<li>${line}</li>`)
  }
  lines.push(`</ul>`)

  // Cosigner — separate, not in the ratio
  if (result.cosigner) {
    const cosignerDocs = result.cosigner.documents.length
    const cosignerParsed = result.cosigner.documents.filter((d) => d.monthlyGross != null).length
    lines.push(`<p><b>Co-signer (not in household ratio):</b> ${escapeHtml(result.cosigner.label)} — documented ${formatMoney(result.cosigner.documentedMonthly)}/mo · ${cosignerParsed} of ${cosignerDocs} doc${cosignerDocs === 1 ? '' : 's'} parsed</p>`)
  }

  // Per-document detail (collapsible-style nested list)
  const docsWithDetail = result.applicants.flatMap((a) => a.documents)
    .concat(result.cosigner ? result.cosigner.documents : [])
  if (docsWithDetail.length > 0) {
    lines.push(`<p><b>Document detail:</b></p>`)
    lines.push(`<ul>`)
    for (const d of docsWithDetail) {
      const tag = d.isCosigner ? '[co-signer]' : d.isOwnerPrimary ? '[primary]' : `[${escapeHtml(d.ownerLabel)}]`
      if (d.extracted) {
        const e = d.extracted
        const monthlyStr = d.monthlyGross != null ? formatMoney(d.monthlyGross) + '/mo' : '—'
        const periodStr = e.payPeriodStart && e.payPeriodEnd
          ? `${e.payPeriodStart} → ${e.payPeriodEnd}` : '—'
        const grossStr = e.grossThisPeriod != null ? formatMoney(e.grossThisPeriod) : '—'
        const ytdStr = e.grossYTD != null ? formatMoney(e.grossYTD) : '—'
        lines.push(
          `<li>${tag} <b>${escapeHtml(d.fileName)}</b> &nbsp;·&nbsp; ${e.documentType} &nbsp;·&nbsp; ${e.payFrequency} &nbsp;·&nbsp; period ${periodStr} &nbsp;·&nbsp; gross ${grossStr} &nbsp;·&nbsp; YTD ${ytdStr} &nbsp;·&nbsp; <b>→ ${monthlyStr}</b> &nbsp;·&nbsp; confidence ${(e.confidence * 100).toFixed(0)}%${e.employer ? ` &nbsp;·&nbsp; ${escapeHtml(e.employer)}` : ''}</li>`,
        )
      } else {
        lines.push(`<li>${tag} <b>${escapeHtml(d.fileName)}</b> &nbsp;·&nbsp; <i>unparsed${d.error ? ` — ${escapeHtml(d.error)}` : ''}</i></li>`)
      }
    }
    lines.push(`</ul>`)
  }

  // @Kayla mention so she's notified about the verification result
  const mention = `<a class="cdx-mention" data-mention-type="User" data-mention-id="${KAYLA_USER_ID}" href="/users/${KAYLA_USER_ID}">@Kayla Richard</a>`
  lines.push(`<p>cc ${mention}</p>`)

  return lines.join('\n')
}

function parseJsonResponse(text: string): ExtractedDoc | null {
  // Pull the first {...} block out — Claude usually returns clean JSON but
  // occasionally wraps it in ```json ... ``` fences.
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return {
      documentType: typeof parsed.documentType === 'string' ? parsed.documentType : 'other',
      applicantName: typeof parsed.applicantName === 'string' ? parsed.applicantName : null,
      employer: typeof parsed.employer === 'string' ? parsed.employer : null,
      payPeriodStart: typeof parsed.payPeriodStart === 'string' ? parsed.payPeriodStart : null,
      payPeriodEnd: typeof parsed.payPeriodEnd === 'string' ? parsed.payPeriodEnd : null,
      payFrequency: ['weekly', 'biweekly', 'semimonthly', 'monthly'].includes(parsed.payFrequency)
        ? parsed.payFrequency : 'unknown',
      grossThisPeriod: typeof parsed.grossThisPeriod === 'number' ? parsed.grossThisPeriod : null,
      grossYTD: typeof parsed.grossYTD === 'number' ? parsed.grossYTD : null,
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
      notes: typeof parsed.notes === 'string' ? parsed.notes : null,
    }
  } catch {
    return null
  }
}
