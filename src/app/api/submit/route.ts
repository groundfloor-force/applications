import { NextRequest, NextResponse } from 'next/server'
import { createApplication, createApplicationUpdate, uploadFileToMonday } from '@/lib/monday'
import { sendConfirmationEmail, sendNotificationEmail } from '@/lib/email'
import { getConfig } from '@/lib/config'
import { generateApplicationPdf } from '@/lib/pdf'
import type { FormData, Property } from '@/lib/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const multipart = await req.formData()

    const raw = multipart.get('data')
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing form data' }, { status: 400 })
    }

    const data: Omit<FormData, 'documents' | 'occupantDocs'> = JSON.parse(raw)

    // Collect uploaded files into reusable buffers (consumed once, used N times)
    const fileBuffers: { buffer: Buffer; name: string; type: string; label: string }[] = []
    for (const [key, value] of multipart.entries()) {
      if (value instanceof File && value.size > 0) {
        if (key.startsWith('doc_')) {
          const buf = Buffer.from(await value.arrayBuffer())
          fileBuffers.push({
            buffer: buf,
            name: value.name,
            type: value.type || 'application/octet-stream',
            label: `${data.firstName}_${data.lastName}`,
          })
        }
        if (key.startsWith('occdoc_')) {
          const parts = key.split('_')
          const occIdx = parseInt(parts[1])
          const occ = data.occupants?.[occIdx]
          const occName = occ ? `${occ.firstName}_${occ.lastName}` : `Occupant_${occIdx + 2}`
          const buf = Buffer.from(await value.arrayBuffer())
          fileBuffers.push({
            buffer: buf,
            name: value.name,
            type: value.type || 'application/octet-stream',
            label: occName,
          })
        }
      }
    }

    // Resolve the list of properties to create items for.
    // `properties` is the multi-select list; if empty, fall back to `property` (legacy / skipped).
    const propertyList: (Property | null)[] = (data.properties && data.properties.length > 0)
      ? data.properties
      : [data.property]

    const token = crypto.randomUUID()
    const allPropertiesSummary = propertyList
      .filter((p): p is Property => p !== null)
      .map((p) => ({ address: p.address, unit: p.unit, city: p.city, rent: p.rent }))

    const dateStr = new Date().toISOString().split('T')[0]
    const itemIds: string[] = []

    // Create one Monday item per property, in preference order.
    for (let i = 0; i < propertyList.length; i++) {
      const prop = propertyList[i]
      const itemData = {
        ...data,
        property: prop,
        // Use this property's rent for the Monday rent column when available
        monthlyRent: prop?.rent ? String(prop.rent) : data.monthlyRent,
      }
      const preference = propertyList.length > 1
        ? { rank: i + 1, total: propertyList.length }
        : null

      const itemId = await createApplication(itemData, token, preference)
      await createApplicationUpdate(itemId, itemData, preference, allPropertiesSummary)

      // Re-generate PDF per item so it reflects the specific property
      const pdfBuffer = generateApplicationPdf(itemData)
      const rankSuffix = preference ? `_choice${preference.rank}` : ''
      const pdfName = `Application_${data.firstName}_${data.lastName}_${dateStr}${rankSuffix}.pdf`
      await uploadFileToMonday(itemId, pdfBuffer, pdfName, 'application/pdf')

      // Upload all income verification documents to this item
      for (const { buffer, name, type, label } of fileBuffers) {
        const safeName = `${label}_${name}`.replace(/[^a-zA-Z0-9._-]/g, '_')
        await uploadFileToMonday(itemId, buffer, safeName, type)
      }

      itemIds.push(itemId)
    }

    // Send applicant + PM emails (failures don't fail the submission)
    const primaryItemId = itemIds[0]
    const mondayItemUrl = `https://groundfloor-force.monday.com/boards/${640654033}/pulses/${primaryItemId}`
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

    return NextResponse.json({ success: true, itemIds, token })
  } catch (error) {
    console.error('Submission error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Submission failed: ${message}` }, { status: 500 })
  }
}
