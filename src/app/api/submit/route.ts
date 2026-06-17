import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createApplication, createApplicationUpdate, uploadFileToMonday, postPlainUpdate } from '@/lib/monday'
import { sendConfirmationEmail, sendNotificationEmail } from '@/lib/email'
import { getConfig } from '@/lib/config'
import { generateApplicationPdf } from '@/lib/pdf'
import { runIncomeVerification, formatVerificationUpdate, type VerificationInput } from '@/lib/income-verification'
import type { FormData } from '@/lib/types'

export const maxDuration = 60

// Parse a money-like string ("$1,500" or "1500") to a number, returning
// null if blank or unparseable.
function parseMoney(s: string | undefined | null): number | null {
  if (!s) return null
  const cleaned = String(s).replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isFinite(n) && n > 0 ? n : null
}

export async function POST(req: NextRequest) {
  try {
    const multipart = await req.formData()

    const raw = multipart.get('data')
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing form data' }, { status: 400 })
    }

    const data: Omit<FormData, 'documents' | 'occupantDocs'> = JSON.parse(raw)
    const rawLocale = multipart.get('locale')
    const locale: 'en' | 'fr' = rawLocale === 'fr' ? 'fr' : 'en'

    // Collect uploaded file buffers with descriptive name prefixes so PMs
    // can tell apart pay stubs, pet photos, co-signer docs, and supporting
    // docs in the Monday files column.
    const fileBuffers: { buffer: Buffer; name: string; type: string; label: string }[] = []
    const baseName = `${data.firstName}_${data.lastName}`

    // Income verification staging — collected here so we can keep buffers
    // in memory once for both Monday upload and Claude extraction.
    const verifyPrimary: { fileName: string; buffer: Buffer; mimeType: string }[] = []
    const verifyOccupants: { fileName: string; buffer: Buffer; mimeType: string }[][] =
      (data.occupants ?? []).map(() => [])
    const verifyCosigner: { fileName: string; buffer: Buffer; mimeType: string }[] = []

    for (const [key, value] of multipart.entries()) {
      if (!(value instanceof File) || value.size === 0) continue
      const buf = Buffer.from(await value.arrayBuffer())
      const type = value.type || 'application/octet-stream'

      if (key.startsWith('doc_')) {
        fileBuffers.push({ buffer: buf, name: value.name, type, label: baseName })
        verifyPrimary.push({ fileName: value.name, buffer: buf, mimeType: type })
      } else if (key.startsWith('occdoc_')) {
        const parts = key.split('_')
        const occIdx = parseInt(parts[1])
        const occ = data.occupants?.[occIdx]
        const occName = occ ? `${occ.firstName}_${occ.lastName}` : `Occupant_${occIdx + 2}`
        fileBuffers.push({ buffer: buf, name: value.name, type, label: occName })
        if (verifyOccupants[occIdx]) {
          verifyOccupants[occIdx].push({ fileName: value.name, buffer: buf, mimeType: type })
        }
      } else if (key.startsWith('petphoto_')) {
        fileBuffers.push({ buffer: buf, name: value.name, type, label: `${baseName}_PetPhoto` })
      } else if (key.startsWith('cosignerdoc_')) {
        const cName = (data.cosignerFirstName && data.cosignerLastName)
          ? `${data.cosignerFirstName}_${data.cosignerLastName}`
          : 'Cosigner'
        fileBuffers.push({ buffer: buf, name: value.name, type, label: `Cosigner_${cName}` })
        verifyCosigner.push({ fileName: value.name, buffer: buf, mimeType: type })
      } else if (key.startsWith('supdoc_')) {
        fileBuffers.push({ buffer: buf, name: value.name, type, label: `${baseName}_Supporting` })
      } else if (key.startsWith('iddoc_')) {
        fileBuffers.push({ buffer: buf, name: value.name, type, label: `${baseName}_PhotoID` })
      }
    }

    // Signature is sent as a base64 data URL in the JSON payload; convert to
    // a PNG attachment so PMs see it in the Monday files column.
    if (data.signatureData && data.signatureData.startsWith('data:image/')) {
      const match = data.signatureData.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) {
        const sigType = match[1]
        const sigBuf = Buffer.from(match[2], 'base64')
        const ext = sigType === 'image/png' ? 'png' : sigType.split('/')[1] || 'png'
        fileBuffers.push({
          buffer: sigBuf,
          name: `signature.${ext}`,
          type: sigType,
          label: `${baseName}_Signature`,
        })
      }
    }

    const token = crypto.randomUUID()

    // Single Monday item per submission, even when multiple properties were
    // selected. The full preference list is surfaced in the update note.
    const itemId = await createApplication(data, token, locale)

    // Surface the applicant's preferred language as a short note before the
    // main details update — Monday lists updates newest-first, so PMs see
    // this near the top when they open the item.
    const langLabel = locale === 'fr' ? 'Français (FR)' : 'English (EN)'
    await postPlainUpdate(
      itemId,
      `<p><b>Preferred language:</b> ${langLabel}</p>`
    ).catch(() => null)

    await createApplicationUpdate(itemId, data)

    const pdfBuffer = generateApplicationPdf(data)
    const dateStr = new Date().toISOString().split('T')[0]
    const pdfName = `Application_${data.firstName}_${data.lastName}_${dateStr}.pdf`
    await uploadFileToMonday(itemId, pdfBuffer, pdfName, 'application/pdf')

    for (const { buffer, name, type, label } of fileBuffers) {
      const safeName = `${label}_${name}`.replace(/[^a-zA-Z0-9._-]/g, '_')
      await uploadFileToMonday(itemId, buffer, safeName, type)
    }

    const mondayItemUrl = `https://groundfloor-force.monday.com/boards/${640654033}/pulses/${itemId}`
    const config = await getConfig().catch(() => null)

    const propertySummary = data.properties && data.properties.length > 1
      ? `${data.properties.length} properties (${data.properties.map((p) => `${p.address}${p.unit ? ` Unit ${p.unit}` : ''}`).join('; ')})`
      : data.property
        ? `${data.property.address}${data.property.unit ? ` Unit ${data.property.unit}` : ''}`
        : ''

    await Promise.allSettled([
      data.email
        ? sendConfirmationEmail(data.email, data.firstName, token)
        : Promise.resolve(),
      config?.notificationEmail
        ? sendNotificationEmail(
            config.notificationEmail,
            `${data.firstName} ${data.lastName}`,
            propertySummary,
            mondayItemUrl
          )
        : Promise.resolve(),
    ])

    // Income verification runs after the response is sent. The applicant
    // sees the success page immediately; the verification update lands on
    // the Monday item ~30-60s later. We keep buffers in the closure rather
    // than re-reading them from request, which is no longer available
    // after the response.
    const monthlyRent = parseMoney(data.monthlyRent) ?? 0
    const verificationInput: VerificationInput = {
      monthlyRent,
      primary: {
        label: `${data.firstName} ${data.lastName}`.trim() || 'Primary',
        selfReportedMonthly: parseMoney(data.monthlyGrossSalary),
        documents: verifyPrimary,
      },
      occupants: (data.occupants ?? []).map((o, i) => ({
        label: `${o.firstName} ${o.lastName}`.trim() || `Occupant ${i + 2}`,
        selfReportedMonthly: parseMoney(o.monthlyGrossSalary),
        documents: verifyOccupants[i] ?? [],
      })),
      cosigner: (data.cosignerFirstName || data.cosignerLastName || verifyCosigner.length > 0)
        ? {
            label: `${data.cosignerFirstName} ${data.cosignerLastName}`.trim() || 'Co-signer',
            documents: verifyCosigner,
          }
        : null,
    }

    after(async () => {
      try {
        const result = await runIncomeVerification(verificationInput)
        const html = formatVerificationUpdate(result)
        await postPlainUpdate(itemId, html)
      } catch (err) {
        console.error('Income verification failed:', err)
        // Best-effort error note so PMs see something happened.
        await postPlainUpdate(
          itemId,
          `<p><b>📋 Income verification failed</b></p><p><i>${err instanceof Error ? err.message : 'Unknown error'}</i></p>`,
        ).catch(() => null)
      }
    })

    return NextResponse.json({ success: true, itemId, token })
  } catch (error) {
    console.error('Submission error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Submission failed: ${message}` }, { status: 500 })
  }
}
