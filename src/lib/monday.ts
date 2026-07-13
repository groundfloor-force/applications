import type { Property, FormData } from './types'

const MONDAY_API_URL = 'https://api.monday.com/v2'
const APPLICATIONS_BOARD_ID = 640654033
const VACANCY_BOARD_ID = 469686343
const NEW_GROUP_ID = 'new_group44751'

function getToken() {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) throw new Error('MONDAY_API_TOKEN environment variable is not set')
  return token
}

async function mondayQuery<T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Monday API HTTP error: ${res.status}`)

  const json = await res.json()
  if (json.errors) throw new Error(`Monday GraphQL error: ${JSON.stringify(json.errors)}`)
  return json.data as T
}

// ── Vacancy Board ─────────────────────────────────────────────────────────────

const AVAILABLE_STATUSES = ['VACANT', 'COMING UP']

const VACANCY_COLUMN_IDS = `[
  "status",
  "text_mkrckabm", "text_mkrcc6j0", "text_mkrcjxvm",
  "text_mkrcw3g6", "numeric_mm2z81x6", "dropdown_mm2znqk1",
  "dropdown_mm2zwhb", "link", "dropdown_mm2zjvrj",
  "dropdown_mm2mdv93", "dropdown_mm2zseg3", "dropdown_mm2zccv7",
  "dropdown_mm2zzz10", "dropdown_mm2z2jvk"
]`

type RawVacancyItem = {
  id: string
  name: string
  column_values: { id: string; text: string; value: string }[]
}

type VacancyPage = { cursor: string | null; items: RawVacancyItem[] }

// The vacancy board has more than 500 items, so a single items_page call
// silently drops newer listings (e.g. 250 Mill Road). Walk the cursor.
export async function getVacancies(): Promise<Property[]> {
  const firstQuery = `
    query {
      boards(ids: [${VACANCY_BOARD_ID}]) {
        items_page(limit: 500) {
          cursor
          items {
            id
            name
            column_values(ids: ${VACANCY_COLUMN_IDS}) { id text value }
          }
        }
      }
    }
  `

  const first = await mondayQuery<{ boards: { items_page: VacancyPage }[] }>(firstQuery)
  const items: RawVacancyItem[] = [...(first.boards[0]?.items_page?.items ?? [])]
  let cursor = first.boards[0]?.items_page?.cursor ?? null

  while (cursor) {
    const next = await mondayQuery<{ next_items_page: VacancyPage }>(
      `query($cursor: String!) {
        next_items_page(cursor: $cursor, limit: 500) {
          cursor
          items {
            id
            name
            column_values(ids: ${VACANCY_COLUMN_IDS}) { id text value }
          }
        }
      }`,
      { cursor }
    )
    items.push(...(next.next_items_page?.items ?? []))
    cursor = next.next_items_page?.cursor ?? null
  }

  return items
    .map((item) => {
      const col = (id: string) => item.column_values.find((c) => c.id === id)
      const t = (id: string) => col(id)?.text ?? ''
      const pictureUrl = t('link')
      const status = t('status')
      const unit = t('text_mkrcc6j0')

      return {
        id: item.id,
        name: item.name,
        address: t('text_mkrckabm') || deriveAddressFromName(item.name, unit),
        unit,
        city: t('text_mkrcjxvm'),
        postal: t('text_mkrcw3g6'),
        rent: parseFloat(t('numeric_mm2z81x6')) || 0,
        bedrooms: t('dropdown_mm2znqk1'),
        bathrooms: t('dropdown_mm2zwhb'),
        pictureUrl,
        available: t('dropdown_mm2zjvrj'),
        laundry: t('dropdown_mm2mdv93'),
        status,
        parking: t('dropdown_mm2zseg3'),
        pets: t('dropdown_mm2zccv7'),
        balcony: t('dropdown_mm2zzz10'),
        floor: t('dropdown_mm2z2jvk'),
      }
    })
    .filter((p) => AVAILABLE_STATUSES.includes(p.status))
}

// Item names look like "250 Mill Road - 1", "93 Thibodeau #6", or "116 Mill".
// When the Address column is blank, recover the street by stripping a trailing
// unit suffix.
function deriveAddressFromName(name: string, unit: string): string {
  if (!name) return ''
  const trimmed = name.trim()
  if (unit) {
    const escaped = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\s*[-#]\\s*${escaped}\\s*$`, 'i')
    const stripped = trimmed.replace(re, '').trim()
    if (stripped) return stripped
  }
  return trimmed.replace(/\s*[-#]\s*\S+\s*$/, '').trim() || trimmed
}

// ── Applications Board ────────────────────────────────────────────────────────

export async function getRecentApplications(limit = 500) {
  const query = `
    query {
      boards(ids: [${APPLICATIONS_BOARD_ID}]) {
        items_page(limit: ${limit}) {
          items {
            id
            name
            created_at
            url
            column_values(ids: ["status1", "rental_address", "unit__", "text1", "text2", "email", "phone6", "date891"]) {
              id text
            }
          }
        }
      }
    }
  `
  type RawItem = {
    id: string; name: string; created_at: string; url: string
    column_values: { id: string; text: string }[]
  }
  const data = await mondayQuery<{ boards: { items_page: { items: RawItem[] } }[] }>(query)
  const items = data.boards[0]?.items_page?.items ?? []
  return items.map((item) => {
    const t = (id: string) => item.column_values.find((c) => c.id === id)?.text ?? ''
    return {
      id: item.id,
      name: item.name,
      url: item.url,
      createdAt: item.created_at,
      status: t('status1'),
      address: t('rental_address'),
      unit: t('unit__'),
      firstName: t('text1'),
      lastName: t('text2'),
      email: t('email'),
      phone: t('phone6'),
      moveInDate: t('date891'),
    }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // newest first by created_at
}

// Fetch every Monday item that shares a token. Used by the co-signer
// return flow so the addendum is attached to all items if any.
// Uses items_page_by_column_values (the current Monday API; the older
// items_by_column_values was deprecated and removed).
export async function getAllApplicationItemsByToken(token: string): Promise<string[]> {
  const safe = token.replace(/[^a-zA-Z0-9-]/g, '')
  const query = `
    query ($boardId: ID!, $columns: [ItemsPageByColumnValuesQuery!]) {
      items_page_by_column_values(board_id: $boardId, columns: $columns, limit: 25) {
        items { id }
      }
    }
  `
  const data = await mondayQuery<{
    items_page_by_column_values: { items: { id: string }[] }
  }>(query, {
    boardId: String(APPLICATIONS_BOARD_ID),
    columns: [{ column_id: 'text_mm3b6n9j', column_values: [safe] }],
  })
  return data.items_page_by_column_values?.items?.map((i) => i.id) ?? []
}

export async function getApplicationByToken(token: string) {
  const safe = token.replace(/[^a-zA-Z0-9-]/g, '')
  const query = `
    query ($boardId: ID!, $columns: [ItemsPageByColumnValuesQuery!]) {
      items_page_by_column_values(board_id: $boardId, columns: $columns, limit: 25) {
        items {
          id name created_at url
          column_values(ids: ["status1", "rental_address", "unit__", "date891"]) {
            id text
          }
        }
      }
    }
  `
  type RawItem = {
    id: string; name: string; created_at: string; url: string
    column_values: { id: string; text: string }[]
  }
  const data = await mondayQuery<{
    items_page_by_column_values: { items: RawItem[] }
  }>(query, {
    boardId: String(APPLICATIONS_BOARD_ID),
    columns: [{ column_id: 'text_mm3b6n9j', column_values: [safe] }],
  })
  const item = data.items_page_by_column_values?.items?.[0]
  if (!item) return null
  const t = (id: string) => item.column_values.find((c) => c.id === id)?.text ?? ''
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    status: t('status1') || 'New',
    address: t('rental_address'),
    unit: t('unit__'),
    moveInDate: t('date891'),
    submittedDate: new Date(item.created_at).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
    mondayUrl: item.url,
  }
}

export async function createApplication(
  data: Omit<FormData, 'documents' | 'occupantDocs'>,
  token?: string,
  locale?: 'en' | 'fr',
): Promise<string> {
  const { property, occupants = [], properties = [] } = data
  const multi = properties.length > 1

  // Item name: "Firstname Lastname - Multiple Properties" when applying to
  // multiple, otherwise the usual "Firstname Lastname - Address Unit X".
  const itemName = multi
    ? `${data.firstName} ${data.lastName} - Multiple Properties`.trim()
    : [
        data.firstName,
        data.lastName,
        '-',
        property?.address ?? '',
        property?.unit ? `Unit ${property.unit}` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .trim()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cv: Record<string, any> = {
    // Primary applicant → Ocpt. 1 columns
    text1: data.firstName,
    text2: data.lastName,
    email: { email: data.email, text: data.email },
    phone6: data.phone,

    // Property
    rental_address: property?.address ?? '',
    unit__: property?.unit ?? '',
    text557: property?.city ?? '',
    text904: 'NB',
    text011: property?.postal ?? '',

    // Financials
    ...(data.monthlyRent && { numbers6: parseFloat(data.monthlyRent) }),
    ...(data.securityDeposit && { numbers9: parseFloat(data.securityDeposit) }),

    // Dates
    date: { date: new Date().toISOString().split('T')[0] },
    ...(data.moveInDate && { date891: { date: data.moveInDate } }),

    // Note: App Status (status1) and Deposit/Fee (status70 "Pending SD") are
    // intentionally left blank on submission. PMs move applications into
    // "Pending SD" manually once the approval email has been sent.

    // Viewing Status — set to "Viewing Complete" if they saw the unit
    ...((data.viewedUnit === 'Yes - In Person' || data.viewedUnit === 'Yes - Virtual Tour')
      && { status29: { label: 'Viewing Complete' } }),

    // Application token for status page (ApplicationId column)
    ...(token && { text_mm3b6n9j: token }),

    // Language the application was submitted in (Language dropdown)
    ...(locale && { dropdown_mm3bp54f: { labels: [locale] } }),
  }

  // Additional occupants count
  const extra = occupants.length
  const occLabel = extra === 0 ? '0' : extra === 1 ? '1' : '2'
  cv.status = { label: occLabel }

  // Occupant 2 (1st additional)
  if (occupants[0]) {
    cv.text56 = occupants[0].firstName
    cv.text44 = occupants[0].lastName
    cv.text8 = occupants[0].email
    cv.text53 = occupants[0].phone
  }

  // Occupant 3 (2nd additional)
  if (occupants[1]) {
    cv.occ__1_name = occupants[1].firstName
    cv.text87 = occupants[1].lastName
    cv.occ__1_email = occupants[1].email
    cv.occ__1_phone__ = occupants[1].phone
  }

  // Link to vacancy board item
  if (property?.id) {
    cv.board_relation_mm0pnwbx = { item_ids: [parseInt(property.id)] }
  }

  const mutation = `
    mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        group_id: $groupId
        item_name: $itemName
        column_values: $columnValues
      ) { id }
    }
  `

  const result = await mondayQuery<{ create_item: { id: string } }>(mutation, {
    boardId: String(APPLICATIONS_BOARD_ID),
    groupId: NEW_GROUP_ID,
    itemName,
    columnValues: JSON.stringify(cv),
  })

  return result.create_item.id
}

export async function createApplicationUpdate(
  itemId: string,
  data: Omit<FormData, 'documents' | 'occupantDocs'>,
): Promise<void> {
  const { property, occupants = [], properties = [] } = data
  const multi = properties.length > 1

  const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']

  // When multi-property, surface the priority list at the very top of the
  // update note so PMs see it before anything else.
  const propertyBlock = multi
    ? [
        '<h2>Properties Applied For (in order of preference)</h2>',
        ...properties.map((p, i) =>
          `<b>${ORDINAL[i] ?? `${i + 1}th`} choice:</b> ${p.address}${p.unit ? ` Unit ${p.unit}` : ''}, ${p.city}${p.rent > 0 ? ` — $${p.rent.toLocaleString()}/mo` : ''}`
        ),
        '',
        '<hr>',
        '',
      ]
    : []

  const lines: string[] = [
    ...propertyBlock,
    '<h2>Rental Application — Full Details</h2>',
    '',
    '<b>Primary Applicant</b>',
    `Name: ${data.firstName} ${data.lastName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Birth Date: ${data.birthDate || '—'}`,
    `Current Address: ${[data.currentAddress, data.currentAddressLine2, data.currentCity, data.currentProvince, data.currentPostal].filter(Boolean).join(', ')}`,
    `Children: ${data.children || 'None stated'}`,
    ...(data.childrenList && data.childrenList.length > 0
      ? data.childrenList
          .filter((c) => c.name || c.birthDate || c.gender)
          .map((c) => {
            const dob = c.birthDate ? ` (DOB: ${c.birthDate})` : ''
            const gender = c.gender ? ` — ${c.gender}` : ''
            return `  · ${c.name || '—'}${dob}${gender}`
          })
      : []),
    `Pets: ${data.pets || 'None stated'}`,
    ...(data.petNames ? [`Pet Name(s): ${data.petNames}`] : []),
    ...(data.sin ? [`SIN: ${data.sin}`] : []),
    '',
    multi ? '<b>Primary Property (1st choice)</b>' : '<b>Property Applied For</b>',
    `Address: ${property?.address ?? ''} ${property?.unit ? `Unit ${property.unit}` : ''}, ${property?.city ?? ''}`,
    `Leasing Agent: ${data.leasingAgent || 'N/A'}`,
    `Requested Monthly Rent: $${data.monthlyRent || property?.rent || '—'}`,
    `Security Deposit: $${data.securityDeposit || '—'}`,
    `Adults (18+): ${data.numOccupants}`,
    `Vehicles: ${data.numVehicles || '—'}`,
    `Requested Move-In Date: ${data.moveInDate || '—'}`,
    '',
    '<b>Unit Viewing</b>',
    `Viewed Unit: ${data.viewedUnit || '—'}`,
    `Leasing Agent: ${data.leasingAgent || '—'}`,
    '',
    '<b>Employment (Primary Applicant)</b>',
    `Employer Name: ${data.employerName || '—'}`,
    '',
    '<b>Rental History</b>',
    `Previous Landlord: ${data.prevLandlordFirstName} ${data.prevLandlordLastName}`.trim() || '—',
    `Landlord Phone: ${data.prevLandlordPhone || '—'}`,
    `Landlord Email: ${data.prevLandlordEmail || '—'}`,
    `Previous Monthly Rent: $${data.prevMonthlyRent || '—'}`,
    `Rented From: ${data.rentedFrom || '—'}  To: ${data.rentedTo || '—'}`,
    `Reason for Leaving: ${data.reasonForLeaving || '—'}`,
    '',
    '<b>References</b>',
    `Reference 1: ${data.ref1FirstName} ${data.ref1LastName} | Phone: ${data.ref1Phone} | Email: ${data.ref1Email}`,
  ]

  if (data.cosignerFirstName) {
    lines.push(
      '',
      '<b>Cosigner</b>',
      `Name: ${data.cosignerFirstName} ${data.cosignerLastName}`,
      `Relationship: ${data.cosignerRelationship || '—'}`,
      `Email: ${data.cosignerEmail || '—'}`,
      `Phone: ${data.cosignerPhone || '—'}`
    )
  }

  if (occupants.length > 0) {
    lines.push('', '<b>Additional Occupants</b>')
    occupants.forEach((occ, i) => {
      lines.push(
        ``,
        `Occupant ${i + 2}: ${occ.firstName} ${occ.lastName}`,
        `  Email: ${occ.email} | Phone: ${occ.phone}`,
        `  Birth Date: ${occ.birthDate || '—'} | Relationship: ${occ.relationship || '—'}`,
        `  Occupation: ${occ.occupation || '—'}`,
        `  Employer: ${occ.employerName || '—'} | Position: ${occ.positionHeld || '—'}`,
        `  Employer Address: ${[occ.employerAddress, occ.employerCity, occ.employerProvince, occ.employerPostal].filter(Boolean).join(', ')}`,
        `  Employer Phone: ${occ.employerPhone || '—'}`,
        `  Employment Period: ${occ.employmentFrom || '—'} to ${occ.employmentTo || 'Current'}`,
        `  Monthly Gross Salary: $${occ.monthlyGrossSalary || '—'}`,
      )
      if (occ.sameAsPrimary === false) {
        lines.push(
          `  Current Address: ${[occ.currentAddress, occ.currentAddressLine2, occ.currentCity, occ.currentProvince, occ.currentPostal].filter(Boolean).join(', ') || '—'}`,
          `  Previous Landlord: ${[occ.prevLandlordFirstName, occ.prevLandlordLastName].filter(Boolean).join(' ') || '—'}`,
          `  Landlord Phone: ${occ.prevLandlordPhone || '—'} | Email: ${occ.prevLandlordEmail || '—'}`,
          `  Reason for Leaving: ${occ.prevReasonForLeaving || '—'}`,
        )
      } else {
        lines.push(`  Address & Landlord: Same as primary applicant`)
      }
    })
  }

  if (data.additionalDetails) {
    lines.push('', '<b>Additional Details from Applicant</b>', data.additionalDetails)
  }

  if (data.signedAt) {
    lines.push('', '<b>Electronic Signature</b>', `Signed by ${data.firstName} ${data.lastName} on ${data.signedAt}. Signature image attached as a file on this item.`)
  }

  const body = lines.join('\n')

  const mutation = `
    mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }
  `
  await mondayQuery(mutation, { itemId, body })
}

// Post a plain HTML note as a Monday update on an item.
export async function postPlainUpdate(itemId: string, bodyHtml: string): Promise<void> {
  const mutation = `
    mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }
  `
  await mondayQuery(mutation, { itemId, body: bodyHtml })
}

// Post a co-signer addendum update note to an existing application item.
export async function createCosignerUpdate(
  itemId: string,
  cosigner: {
    firstName: string
    lastName: string
    relationship: string
    email: string
    phone: string
  }
): Promise<void> {
  const lines = [
    '<h2>Co-signer Addendum</h2>',
    `<i>Submitted: ${new Date().toLocaleString('en-CA')}</i>`,
    '',
    `<b>Co-signer Name:</b> ${cosigner.firstName} ${cosigner.lastName}`,
    `<b>Relationship:</b> ${cosigner.relationship || '—'}`,
    `<b>Email:</b> ${cosigner.email || '—'}`,
    `<b>Phone:</b> ${cosigner.phone || '—'}`,
  ]
  const body = lines.join('\n')
  const mutation = `
    mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }
  `
  await mondayQuery(mutation, { itemId, body })
}

export async function uploadFileToMonday(
  itemId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  columnId: string = 'files',
): Promise<void> {
  const query = `mutation ($file: File!) {
    add_file_to_column(item_id: ${itemId}, column_id: "${columnId}", file: $file) { id }
  }`

  const form = new FormData()
  form.append('query', query)
  form.append('variables[file]', new Blob([fileBuffer.buffer as ArrayBuffer], { type: mimeType }), fileName)

  const res = await fetch('https://api.monday.com/v2/file', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Monday file upload failed (${res.status}): ${text}`)
  }
}

// ── Support Board ─────────────────────────────────────────────────────────────

const SUPPORT_BOARD_ID = 675837564
const SUPPORT_GROUP_NEW_EMAILED = 'emailed_items10521'

export interface SupportFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  subject: string
  comment: string
}

export interface VacancyMatch {
  itemId: string
  pod: string | null // Alpha POD | Bravo POD | null
  matchedName: string
}

// Normalize an address string for fuzzy matching. Strips punctuation,
// street-type suffixes, unit prefixes, and collapses whitespace.
function normalizeAddress(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bunit\s*#?\s*\w+/g, '')
    .replace(/\bapt\.?\s*#?\s*\w+/g, '')
    .replace(/\b(street|st|road|rd|avenue|ave|drive|dr|court|ct|lane|ln|boulevard|blvd|crescent|cres|place|pl|way|highway|hwy)\b\.?/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type VacancyRow = {
  id: string
  name: string
  column_values: { id: string; text: string }[]
}
type VacancyPageResp = { cursor: string | null; items: VacancyRow[] }

// In-memory cache of the Vacancy List for support address matching. Vacancies
// change slowly relative to support-form volume, so a 5-minute TTL cuts the
// per-submission Monday API round-trip cost from ~2-4s to ~0ms on warm
// serverless instances. Cache lives per-lambda-instance.
const VACANCY_CACHE_TTL_MS = 5 * 60 * 1000
let vacancyCache: { items: VacancyRow[]; fetchedAt: number } | null = null

async function fetchVacancyRows(): Promise<VacancyRow[]> {
  if (vacancyCache && Date.now() - vacancyCache.fetchedAt < VACANCY_CACHE_TTL_MS) {
    return vacancyCache.items
  }

  const firstQuery = `
    query {
      boards(ids: [${VACANCY_BOARD_ID}]) {
        items_page(limit: 500) {
          cursor
          items {
            id
            name
            column_values(ids: ["dropdown_mm4p9tx9", "text_mkrckabm", "text_mkrcc6j0"]) {
              id text
            }
          }
        }
      }
    }
  `

  const first = await mondayQuery<{ boards: { items_page: VacancyPageResp }[] }>(firstQuery)
  const items: VacancyRow[] = [...(first.boards[0]?.items_page?.items ?? [])]
  let cursor = first.boards[0]?.items_page?.cursor ?? null

  while (cursor) {
    const next = await mondayQuery<{ next_items_page: VacancyPageResp }>(`
      query {
        next_items_page(cursor: "${cursor}", limit: 500) {
          cursor
          items {
            id
            name
            column_values(ids: ["dropdown_mm4p9tx9", "text_mkrckabm", "text_mkrcc6j0"]) {
              id text
            }
          }
        }
      }
    `)
    items.push(...(next.next_items_page?.items ?? []))
    cursor = next.next_items_page?.cursor ?? null
  }

  vacancyCache = { items, fetchedAt: Date.now() }
  return items
}

// Match the applicant's free-text address against Vacancy List items.
// Returns the best-scoring match and its POD, or null if nothing scores.
export async function findVacancyForSupport(address: string): Promise<VacancyMatch | null> {
  const needle = normalizeAddress(address)
  if (!needle) return null

  const items = await fetchVacancyRows()

  // Score = number of needle tokens that appear in the candidate's normalized
  // combined name + mailing address. Requires at least the majority of tokens
  // (and 2+ if the address is more than one token) to avoid spurious matches.
  const needleTokens = needle.split(' ').filter(Boolean)
  let best: { row: VacancyRow; score: number } | null = null

  for (const row of items) {
    const mailing = row.column_values.find((c) => c.id === 'text_mkrckabm')?.text ?? ''
    const unit = row.column_values.find((c) => c.id === 'text_mkrcc6j0')?.text ?? ''
    const combined = normalizeAddress(`${row.name} ${mailing} ${unit}`)
    const combinedTokens = new Set(combined.split(' ').filter(Boolean))
    let score = 0
    for (const tok of needleTokens) if (combinedTokens.has(tok)) score++
    if (!best || score > best.score) best = { row, score }
  }

  if (!best) return null
  const required = Math.max(2, Math.ceil(needleTokens.length * 0.6))
  if (best.score < required) return null

  const podRaw = best.row.column_values.find((c) => c.id === 'dropdown_mm4p9tx9')?.text ?? ''
  // Vacancy uses "A" / "B" / "B (modified)"; Support uses "Alpha POD" / "Bravo POD".
  let pod: string | null = null
  const podUpper = podRaw.trim().toUpperCase()
  if (podUpper === 'A') pod = 'Alpha POD'
  else if (podUpper.startsWith('B')) pod = 'Bravo POD'

  return { itemId: best.row.id, pod, matchedName: best.row.name }
}

export async function createSupportItem(data: SupportFormData): Promise<string> {
  const itemName = `${data.subject.trim()} = ${data.address.trim()}`.slice(0, 250)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cv: Record<string, any> = {
    text: data.firstName,
    text_mkytg1vg: data.lastName,
    text_mkytj9q0: data.email,
    phone: { phone: data.phone, countryShortName: 'CA' },
    short_texts3qc1dzd: data.address,
    date6: { date: new Date().toISOString().split('T')[0] },
  }

  const mutation = `
    mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        group_id: $groupId
        item_name: $itemName
        column_values: $columnValues
      ) { id }
    }
  `

  const result = await mondayQuery<{ create_item: { id: string } }>(mutation, {
    boardId: String(SUPPORT_BOARD_ID),
    groupId: SUPPORT_GROUP_NEW_EMAILED,
    itemName,
    columnValues: JSON.stringify(cv),
  })

  return result.create_item.id
}

// Patch POD + Vacancy List link onto an existing Support item. Used to
// backfill vacancy match after the response has been returned so the
// applicant isn't blocked by the vacancy fetch.
export async function applyVacancyMatchToSupportItem(
  itemId: string,
  vacancy: VacancyMatch,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cv: Record<string, any> = {}
  if (vacancy.itemId) cv.board_relation_mm33kdmz = { item_ids: [Number(vacancy.itemId)] }
  if (vacancy.pod) cv.dropdown_mm4z9d6z = { labels: [vacancy.pod] }
  if (Object.keys(cv).length === 0) return

  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
      ) { id }
    }
  `
  await mondayQuery(mutation, {
    boardId: String(SUPPORT_BOARD_ID),
    itemId: String(itemId),
    columnValues: JSON.stringify(cv),
  })
}

export const SUPPORT_FILES_COLUMN_ID = 'file_mm33ek9z'
export const SUPPORT_BOARD_URL_PREFIX = `https://groundfloor-force.monday.com/boards/${SUPPORT_BOARD_ID}/pulses/`

// ── Maintenance Board (CORE Master Pipeline) ─────────────────────────────────

const MAINTENANCE_BOARD_ID = 9200285810
const MAINTENANCE_GROUP_NEW = 'topics' // "New Requests"

export interface MaintenanceFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  subject: string
  comment: string
  priority: string // 'Emergency' | 'Urgent' | 'Routine' | ''
  category: string // one of the Request Type labels below, or ''
  permission: string // one of the Permission to Enter labels below, or ''
}

// Tenant-facing priority → the board's 1-5 star "Priority" rating column.
const MAINTENANCE_PRIORITY_RATING: Record<string, number> = {
  Emergency: 5,
  Urgent: 3,
  Routine: 1,
}

// Issue categories the form offers. These map 1:1 to EXISTING "Request Type"
// (color_mkr5qx2c) labels on the live board — do not add labels the board
// doesn't already have or Monday rejects the mutation.
export const MAINTENANCE_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Handyman',
  'Outdoor Works',
  'Renovations',
] as const

// Permission-to-enter options mirror the board's dropdown_mks3z9g2 labels exactly.
export const MAINTENANCE_PERMISSIONS = [
  '✅ Yes - Access any time.',
  '✅ Yes - Notice appreciated but not required.',
  '❌ No - Do not enter. Contact me to schedule.',
  'Other',
] as const

export async function createMaintenanceItem(data: MaintenanceFormData): Promise<string> {
  const itemName = `${data.subject.trim()} = ${data.address.trim()}`.slice(0, 250)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cv: Record<string, any> = {
    text_mkrw29qj: data.firstName,
    text_mksa14cc: data.lastName,
    text_mks5jhmk: data.email,
    phone_mks5t8rd: { phone: data.phone, countryShortName: 'CA' },
    long_text_mks5m4ks: data.comment,
    date4: { date: new Date().toISOString().split('T')[0] },
    status: { label: 'New' }, // Ops. Status
    color_mks9a2es: { label: 'Public_form' }, // Helper-Status = source
  }

  if (data.category && (MAINTENANCE_CATEGORIES as readonly string[]).includes(data.category)) {
    cv.color_mkr5qx2c = { label: data.category } // Request Type
  }

  if (data.priority && MAINTENANCE_PRIORITY_RATING[data.priority] != null) {
    cv.rating_mm3kbn0z = { rating: MAINTENANCE_PRIORITY_RATING[data.priority] }
  }

  if (data.permission && (MAINTENANCE_PERMISSIONS as readonly string[]).includes(data.permission)) {
    cv.dropdown_mks3z9g2 = { labels: [data.permission] }
  }

  const mutation = `
    mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        group_id: $groupId
        item_name: $itemName
        column_values: $columnValues
      ) { id }
    }
  `

  const result = await mondayQuery<{ create_item: { id: string } }>(mutation, {
    boardId: String(MAINTENANCE_BOARD_ID),
    groupId: MAINTENANCE_GROUP_NEW,
    itemName,
    columnValues: JSON.stringify(cv),
  })

  return result.create_item.id
}

// Backfill the matched Vacancy/property onto an existing maintenance item via the
// "Property Link" board_relation. Deferred so the applicant isn't blocked by the
// paginated Vacancy fetch. Reuses findVacancyForSupport() for matching.
export async function applyVacancyMatchToMaintenanceItem(
  itemId: string,
  vacancy: VacancyMatch,
): Promise<void> {
  if (!vacancy.itemId) return
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
      ) { id }
    }
  `
  await mondayQuery(mutation, {
    boardId: String(MAINTENANCE_BOARD_ID),
    itemId: String(itemId),
    columnValues: JSON.stringify({
      board_relation_mks9xwzr: { item_ids: [Number(vacancy.itemId)] },
    }),
  })
}

export const MAINTENANCE_FILES_COLUMN_ID = 'file_mkrwbk1w' // Pics/Files
export const MAINTENANCE_BOARD_URL_PREFIX = `https://groundfloor-force.monday.com/boards/${MAINTENANCE_BOARD_ID}/pulses/`
