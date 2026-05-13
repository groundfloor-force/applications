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

export async function getVacancies(): Promise<Property[]> {
  const query = `
    query {
      boards(ids: [${VACANCY_BOARD_ID}]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values(ids: [
              "status",
              "text_mkrckabm", "text_mkrcc6j0", "text_mkrcjxvm",
              "text_mkrcw3g6", "numeric_mm2z81x6", "dropdown_mm2znqk1",
              "dropdown_mm2zwhb", "link", "dropdown_mm2zjvrj",
              "dropdown_mm2mdv93", "dropdown_mm2zseg3", "dropdown_mm2zccv7",
              "dropdown_mm2zzz10", "dropdown_mm2z2jvk"
            ]) {
              id
              text
              value
            }
          }
        }
      }
    }
  `

  type RawItem = {
    id: string
    name: string
    column_values: { id: string; text: string; value: string }[]
  }

  const data = await mondayQuery<{ boards: { items_page: { items: RawItem[] } }[] }>(query)
  const items = data.boards[0]?.items_page?.items ?? []

  return items
    .map((item) => {
      const col = (id: string) => item.column_values.find((c) => c.id === id)
      const t = (id: string) => col(id)?.text ?? ''
      const pictureUrl = t('link')
      const status = t('status')

      return {
        id: item.id,
        name: item.name,
        address: t('text_mkrckabm'),
        unit: t('text_mkrcc6j0'),
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

// Fetch every Monday item that shares a token (one per property when
// the applicant applied for multiple). Used by the co-signer return flow
// so the addendum is attached to all items, not just the first.
export async function getAllApplicationItemsByToken(token: string): Promise<string[]> {
  const safe = token.replace(/[^a-zA-Z0-9-]/g, '')
  const query = `
    query {
      items_by_column_values(
        board_id: ${APPLICATIONS_BOARD_ID},
        column_id: "text0",
        column_value: "${safe}"
      ) { id }
    }
  `
  const data = await mondayQuery<{ items_by_column_values: { id: string }[] }>(query)
  return data.items_by_column_values?.map((i) => i.id) ?? []
}

export async function getApplicationByToken(token: string) {
  // Sanitize token — only allow alphanumeric + hyphens
  const safe = token.replace(/[^a-zA-Z0-9-]/g, '')
  const query = `
    query {
      items_by_column_values(
        board_id: ${APPLICATIONS_BOARD_ID},
        column_id: "text0",
        column_value: "${safe}"
      ) {
        id name created_at url
        column_values(ids: ["status1", "rental_address", "unit__", "date891"]) {
          id text
        }
      }
    }
  `
  type RawItem = {
    id: string; name: string; created_at: string; url: string
    column_values: { id: string; text: string }[]
  }
  const data = await mondayQuery<{ items_by_column_values: RawItem[] }>(query)
  const item = data.items_by_column_values?.[0]
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

    // Application token for status page
    ...(token && { text0: token }),
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
    `Pets: ${data.pets || 'None stated'}`,
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
    ...(data.viewedByName ? [`Shown By: ${data.viewedByName}`] : []),
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

  const body = lines.join('\n')

  const mutation = `
    mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }
  `
  await mondayQuery(mutation, { itemId, body })
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
  mimeType: string
): Promise<void> {
  const query = `mutation ($file: File!) {
    add_file_to_column(item_id: ${itemId}, column_id: "files", file: $file) { id }
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
