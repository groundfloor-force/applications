import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createApplication, createApplicationUpdate, uploadFileToMonday, postPlainUpdate } from '@/lib/monday'
import { sendConfirmationEmail, sendNotificationEmail, sendFailureNotificationEmail } from '@/lib/email'
import { getConfig } from '@/lib/config'
import { generateApplicationPdf } from '@/lib/pdf'
import { runIncomeVerification, formatVerificationUpdate, type VerificationInput } from '@/lib/income-verification'
import {
  buildFullDetails,
  buildIntakePayload,
  commentIdFor,
  fileIdFor,
  htmlToPlainText,
  isAllowedLighthouseFile,
  postApplicationComment,
  postApplicationFile,
  postApplicationIntake,
} from '@/lib/lighthouse-intake'
import type { FormData } from '@/lib/types'

export const maxDuration = 300

function parseMoney(s: string | undefined | null): number | null {
  if (!s) return null
  const cleaned = String(s).replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isFinite(n) && n > 0 ? n : null
}

export async function POST(req: NextRequest) {
  // Short 8-char id for grep-ability in Vercel logs and cross-reference in
  // the failure notification email + client error banner.
  const requestId = crypto.randomUUID().slice(0, 8)
  const startedAt = Date.now()
  let stage = 'init'

  // Captured for the failure email if we crash before parsing.
  let applicantName = ''
  let applicantEmail = ''
  let applicantPhone = ''
  let propertyAddress = ''
  let fileCount = 0
  let payloadBytes = 0

  const log = (event: string, extra: Record<string, unknown> = {}) => {
    console.log(
      `[submit ${requestId}] stage=${stage} event=${event} elapsedMs=${Date.now() - startedAt}` +
        (Object.keys(extra).length ? ' ' + JSON.stringify(extra) : ''),
    )
  }

  try {
    stage = 'parse_multipart'
    log('start')
    const multipart = await req.formData()

    stage = 'parse_json'
    const raw = multipart.get('data')
    if (!raw || typeof raw !== 'string') {
      log('missing_data')
      return NextResponse.json({ error: 'Missing form data', requestId }, { status: 400 })
    }

    const data: Omit<FormData, 'documents' | 'occupantDocs'> = JSON.parse(raw)
    const rawLocale = multipart.get('locale')
    const locale: 'en' | 'fr' = rawLocale === 'fr' ? 'fr' : 'en'

    applicantName = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim()
    applicantEmail = data.email ?? ''
    applicantPhone = data.phone ?? ''
    propertyAddress =
      data.properties && data.properties.length > 1
        ? `${data.properties.length} properties (${data.properties.map((p) => `${p.address}${p.unit ? ` Unit ${p.unit}` : ''}`).join('; ')})`
        : data.property
          ? `${data.property.address}${data.property.unit ? ` Unit ${data.property.unit}` : ''}`
          : ''

    log('parsed', { applicant: applicantName, email: applicantEmail, locale })

    stage = 'extract_files'
    const fileBuffers: { buffer: Buffer; name: string; type: string; label: string }[] = []
    const baseName = `${data.firstName}_${data.lastName}`
    const verifyPrimary: { fileName: string; buffer: Buffer; mimeType: string }[] = []
    const verifyOccupants: { fileName: string; buffer: Buffer; mimeType: string }[][] =
      (data.occupants ?? []).map(() => [])
    const verifyCosigner: { fileName: string; buffer: Buffer; mimeType: string }[] = []

    for (const [key, value] of multipart.entries()) {
      if (!(value instanceof File) || value.size === 0) continue
      const buf = Buffer.from(await value.arrayBuffer())
      const type = value.type || 'application/octet-stream'
      payloadBytes += buf.length

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
        payloadBytes += sigBuf.length
      }
    }

    fileCount = fileBuffers.length
    log('files_extracted', {
      fileCount,
      payloadMB: (payloadBytes / 1024 / 1024).toFixed(2),
      files: fileBuffers.map((f) => ({ name: f.name, mb: (f.buffer.length / 1024 / 1024).toFixed(2), type: f.type })),
    })

    const token = crypto.randomUUID()

    stage = 'monday_create_item'
    const itemId = await createApplication(data, token, locale)
    log('item_created', { itemId })

    stage = 'monday_language_update'
    const langLabel = locale === 'fr' ? 'Français (FR)' : 'English (EN)'
    await postPlainUpdate(itemId, `<p><b>Preferred language:</b> ${langLabel}</p>`).catch(() => null)

    stage = 'monday_details_update'
    await createApplicationUpdate(itemId, data)
    log('updates_posted')

    stage = 'pdf_generate'
    const pdfBuffer = generateApplicationPdf(data)
    log('pdf_generated', { pdfKB: Math.round(pdfBuffer.length / 1024) })

    stage = 'monday_upload_pdf'
    const dateStr = new Date().toISOString().split('T')[0]
    const pdfName = `Application_${data.firstName}_${data.lastName}_${dateStr}.pdf`
    await uploadFileToMonday(itemId, pdfBuffer, pdfName, 'application/pdf')
    log('pdf_uploaded')

    stage = 'monday_upload_files'
    const CONCURRENCY = 4
    const queue = fileBuffers.map(({ buffer, name, type, label }) => ({
      buffer,
      type,
      safeName: `${label}_${name}`.replace(/[^a-zA-Z0-9._-]/g, '_'),
    }))
    let uploaded = 0
    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift()
        if (!item) return
        try {
          await uploadFileToMonday(itemId, item.buffer, item.safeName, item.type)
          uploaded++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[submit ${requestId}] file_upload_failed name=${item.safeName} error="${msg}"`)
          throw err
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    log('files_uploaded', { uploaded })

    stage = 'notify_emails'
    const mondayItemUrl = `https://groundfloor-force.monday.com/boards/${640654033}/pulses/${itemId}`
    const config = await getConfig().catch(() => null)

    await Promise.allSettled([
      data.email
        ? sendConfirmationEmail(data.email, data.firstName, token)
        : Promise.resolve(),
      config?.notificationEmail
        ? sendNotificationEmail(
            config.notificationEmail,
            `${data.firstName} ${data.lastName}`,
            propertyAddress,
            mondayItemUrl,
          )
        : Promise.resolve(),
    ])
    log('emails_sent')

    // Dual-write to Lighthouse. Never fail the Monday path if this errors.
    stage = 'lighthouse_intake'
    let lighthouseId: number | undefined
    let lighthousePortalUrl: string | undefined
    try {
      const lh = await postApplicationIntake(buildIntakePayload(data, token, locale))
      if (!lh) {
        log('lighthouse_intake_skipped', { reason: 'not_configured' })
      } else {
        lighthouseId = lh.id
        lighthousePortalUrl = lh.portalUrl
        log('lighthouse_intake_ok', {
          lighthouseId: lh.id,
          applicationId: lh.applicationId,
          portalUrl: lh.portalUrl ?? null,
        })

        // Mirror Monday updates into Lighthouse Updates (comments). Best-effort.
        const langLabel = locale === 'fr' ? 'Français (FR)' : 'English (EN)'
        try {
          const c1 = await postApplicationComment({
            applicationId: token,
            lighthouseId: lh.id,
            body: `Preferred language: ${langLabel}`,
            commentId: commentIdFor(token, 'preferred-language'),
          })
          log('lighthouse_comment_ok', { kind: 'preferred-language', commentId: c1?.id, duplicate: c1?.duplicate ?? false })
        } catch (cErr) {
          const msg = cErr instanceof Error ? cErr.message : String(cErr)
          console.error(`[submit ${requestId}] lighthouse_comment_failed kind=preferred-language error="${msg}"`)
          log('lighthouse_comment_failed', { kind: 'preferred-language', error: msg })
        }

        try {
          const c2 = await postApplicationComment({
            applicationId: token,
            lighthouseId: lh.id,
            body: buildFullDetails(data),
            commentId: commentIdFor(token, 'full-details'),
          })
          log('lighthouse_comment_ok', { kind: 'full-details', commentId: c2?.id, duplicate: c2?.duplicate ?? false })
        } catch (cErr) {
          const msg = cErr instanceof Error ? cErr.message : String(cErr)
          console.error(`[submit ${requestId}] lighthouse_comment_failed kind=full-details error="${msg}"`)
          log('lighthouse_comment_failed', { kind: 'full-details', error: msg })
        }

        // Mirror Monday files into Lighthouse Files. One request per file; best-effort.
        const lhFiles: { buffer: Buffer; fileName: string; mimeType: string; kind: string }[] = [
          { buffer: pdfBuffer, fileName: pdfName, mimeType: 'application/pdf', kind: 'application-pdf' },
          ...fileBuffers.map(({ buffer, name, type, label }) => ({
            buffer,
            fileName: `${label}_${name}`.replace(/[^a-zA-Z0-9._-]/g, '_'),
            mimeType: type,
            kind: `doc:${label}_${name}`.replace(/[^a-zA-Z0-9._-]/g, '_'),
          })),
        ]

        let lhUploaded = 0
        let lhSkipped = 0
        for (const f of lhFiles) {
          const allowed = isAllowedLighthouseFile(f.fileName, f.buffer.length)
          if (!allowed.ok) {
            lhSkipped++
            log('lighthouse_file_skipped', { fileName: f.fileName, reason: allowed.reason })
            continue
          }
          try {
            const up = await postApplicationFile({
              applicationId: token,
              lighthouseId: lh.id,
              buffer: f.buffer,
              fileName: f.fileName,
              mimeType: f.mimeType,
              fileId: fileIdFor(token, f.kind),
            })
            lhUploaded++
            log('lighthouse_file_ok', {
              fileName: f.fileName,
              fileId: up?.id,
              duplicate: up?.duplicate ?? false,
            })
          } catch (fErr) {
            const msg = fErr instanceof Error ? fErr.message : String(fErr)
            console.error(
              `[submit ${requestId}] lighthouse_file_failed fileName=${f.fileName} error="${msg}"`,
            )
            log('lighthouse_file_failed', { fileName: f.fileName, error: msg })
          }
        }
        log('lighthouse_files_done', { uploaded: lhUploaded, skipped: lhSkipped, total: lhFiles.length })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[submit ${requestId}] lighthouse_intake_failed error="${msg}"`)
      log('lighthouse_intake_failed', { error: msg })
    }

    stage = 'schedule_income_verification'
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
        console.log(`[submit ${requestId}] income_verification_ok`)

        // Best-effort upsert: same applicationId, attach verification JSON.
        try {
          const lh = await postApplicationIntake(
            buildIntakePayload(data, token, locale, result),
          )
          if (lh) {
            console.log(
              `[submit ${requestId}] lighthouse_income_upsert_ok lighthouseId=${lh.id}`,
            )
          }
        } catch (lhErr) {
          const msg = lhErr instanceof Error ? lhErr.message : String(lhErr)
          console.error(
            `[submit ${requestId}] lighthouse_income_upsert_failed error="${msg}"`,
          )
        }

        // Mirror income-verification Monday update into Lighthouse comments.
        try {
          const c = await postApplicationComment({
            applicationId: token,
            lighthouseId,
            body: htmlToPlainText(html),
            commentId: commentIdFor(token, 'income-verification'),
          })
          console.log(
            `[submit ${requestId}] lighthouse_comment_ok kind=income-verification commentId=${c?.id ?? 'null'} duplicate=${c?.duplicate ?? false}`,
          )
        } catch (cErr) {
          const msg = cErr instanceof Error ? cErr.message : String(cErr)
          console.error(
            `[submit ${requestId}] lighthouse_comment_failed kind=income-verification error="${msg}"`,
          )
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[submit ${requestId}] income_verification_failed error="${msg}"`)
        await postPlainUpdate(
          itemId,
          `<p><b>📋 Income verification failed</b></p><p><i>${msg}</i></p>`,
        ).catch(() => null)

        try {
          await postApplicationComment({
            applicationId: token,
            lighthouseId,
            body: `Income verification failed\n${msg}`,
            commentId: commentIdFor(token, 'income-verification-failed'),
          })
        } catch (cErr) {
          const cMsg = cErr instanceof Error ? cErr.message : String(cErr)
          console.error(
            `[submit ${requestId}] lighthouse_comment_failed kind=income-verification-failed error="${cMsg}"`,
          )
        }
      }
    })

    stage = 'done'
    log('success', { itemId, lighthouseId: lighthouseId ?? null, totalMs: Date.now() - startedAt })
    return NextResponse.json({
      success: true,
      itemId,
      token,
      requestId,
      ...(lighthouseId != null && { lighthouseId }),
      ...(lighthousePortalUrl && { lighthousePortalUrl }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined
    const elapsedMs = Date.now() - startedAt
    const payloadMB = (payloadBytes / 1024 / 1024).toFixed(2)

    console.error(
      `[submit ${requestId}] FAILED stage=${stage} elapsedMs=${elapsedMs} applicant="${applicantName}" ` +
        `email=${applicantEmail} files=${fileCount} payloadMB=${payloadMB} error="${message}"`,
    )
    if (stack) console.error(`[submit ${requestId}] stack:\n${stack}`)

    // Best-effort staff notification so failures don't stay silent.
    try {
      const config = await getConfig().catch(() => null)
      if (config?.notificationEmail) {
        await sendFailureNotificationEmail(config.notificationEmail, {
          requestId,
          stage,
          errorMessage: message,
          applicantName,
          applicantEmail,
          applicantPhone,
          propertyAddress,
          fileCount,
          payloadMB,
          elapsedMs,
        })
      }
    } catch (notifyErr) {
      console.error(`[submit ${requestId}] failure_notification_failed:`, notifyErr)
    }

    return NextResponse.json(
      {
        error: `Submission failed at ${stage}: ${message}`,
        requestId,
        stage,
      },
      { status: 500 },
    )
  }
}
