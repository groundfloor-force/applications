import { describe, it, expect } from 'vitest'
import { inflateSync } from 'zlib'
import {
  DEFAULT_RM_VALIDATION,
  incomingPeople,
  joinNames,
  leaving,
  pdfFileName,
  roommateItemName,
  staying,
  validateRoommateStep,
} from '../roommate-change'
import { emptyRoommatePerson, initialRoommateChangeData, type RoommateChangeData, type RoommatePerson } from '../types'
import { generateRoommateChangePdf } from '../pdf'

function person(partial: Partial<RoommatePerson> & { firstName: string; lastName: string }): RoommatePerson {
  return {
    ...emptyRoommatePerson(),
    email: `${partial.firstName.toLowerCase()}@example.com`,
    phone: '506-555-1000',
    status: 'staying',
    ...partial,
  }
}

function validData(overrides: Partial<RoommateChangeData> = {}): RoommateChangeData {
  return {
    ...initialRoommateChangeData(),
    unitId: '123',
    unitName: '21 Newcombe Dr - 106',
    tenants: [
      person({ firstName: 'Alex', lastName: 'Stay', status: 'staying' }),
      person({ firstName: 'Sam', lastName: 'Leave', status: 'leaving' }),
    ],
    hasIncoming: false,
    incoming: [],
    feeAgreed: true,
    ...overrides,
  }
}

function extractText(pdf: Buffer): string {
  const raw = pdf.toString('latin1')
  let text = ''
  const streamRe = /<<([^>]*)>>\s*stream\r?\n/g
  let m: RegExpExecArray | null
  while ((m = streamRe.exec(raw))) {
    const start = m.index + m[0].length
    const end = raw.indexOf('endstream', start)
    let content = raw.slice(start, end)
    if (m[1].includes('FlateDecode')) {
      try {
        content = inflateSync(Buffer.from(content, 'latin1')).toString('latin1')
      } catch {
        continue
      }
    }
    for (const t of content.matchAll(/\((.*?)\) Tj/g)) text += t[1] + '\n'
  }
  return text.replace(/\\([()])/g, '$1')
}

describe('validateRoommateStep', () => {
  it('requires a selected address on step 1', () => {
    const e = validateRoommateStep(1, initialRoommateChangeData(), DEFAULT_RM_VALIDATION)
    expect(e.unitId).toBe(DEFAULT_RM_VALIDATION.addressRequired)
  })

  it('requires complete contact details for every current tenant', () => {
    const data = validData({
      tenants: [
        person({ firstName: 'Alex', lastName: 'Stay', email: '', status: 'staying' }),
        person({ firstName: 'Sam', lastName: 'Leave', status: 'leaving' }),
      ],
    })
    const e = validateRoommateStep(2, data, DEFAULT_RM_VALIDATION)
    expect(e.tenant0_email).toBe(DEFAULT_RM_VALIDATION.emailRequired)
  })

  it('rejects everyone staying (nobody leaving)', () => {
    const data = validData({
      tenants: [
        person({ firstName: 'Alex', lastName: 'One', status: 'staying' }),
        person({ firstName: 'Jordan', lastName: 'Two', status: 'staying' }),
      ],
    })
    const e = validateRoommateStep(3, data, DEFAULT_RM_VALIDATION)
    expect(e.needLeaving).toBe(DEFAULT_RM_VALIDATION.needLeaving)
    expect(leaving(data)).toHaveLength(0)
    expect(staying(data)).toHaveLength(2)
  })

  it('rejects everyone leaving (nobody staying)', () => {
    const data = validData({
      tenants: [
        person({ firstName: 'Alex', lastName: 'One', status: 'leaving' }),
        person({ firstName: 'Jordan', lastName: 'Two', status: 'leaving' }),
      ],
    })
    const e = validateRoommateStep(3, data, DEFAULT_RM_VALIDATION)
    expect(e.needStaying).toBe(DEFAULT_RM_VALIDATION.needStaying)
  })

  it('allows staying + leaving with nobody new moving in', () => {
    const e = validateRoommateStep(7, validData(), DEFAULT_RM_VALIDATION)
    expect(e).toEqual({})
    expect(incomingPeople(validData())).toHaveLength(0)
  })

  it('requires incoming contact details when someone is moving in', () => {
    const data = validData({
      hasIncoming: true,
      incoming: [person({ firstName: 'Taylor', lastName: 'New', email: 'not-an-email', status: '' })],
    })
    const e = validateRoommateStep(4, data, DEFAULT_RM_VALIDATION)
    expect(e.incoming0_email).toBe(DEFAULT_RM_VALIDATION.emailInvalid)
  })

  it('requires the fee agreement before submit', () => {
    const e = validateRoommateStep(6, validData({ feeAgreed: false }), DEFAULT_RM_VALIDATION)
    expect(e.feeAgreed).toBe(DEFAULT_RM_VALIDATION.feeRequired)
  })
})

describe('roommate helpers', () => {
  it('builds an item name from the unit', () => {
    expect(roommateItemName(validData())).toBe('Roommate Change – 21 Newcombe Dr Unit 106')
  })

  it('joins names for the confirm sentence', () => {
    expect(joinNames(validData().tenants, 'and')).toBe('Alex Stay and Sam Leave')
  })

  it('sanitizes the PDF filename', () => {
    expect(pdfFileName(validData())).toMatch(/^RoommateChange_21_Newcombe_Dr_106_\d{4}-\d{2}-\d{2}\.pdf$/)
  })
})

describe('generateRoommateChangePdf', () => {
  it('includes staying, leaving, incoming, and fee sections', () => {
    const data = validData({
      hasIncoming: true,
      incoming: [person({ firstName: 'Taylor', lastName: 'New', email: 'taylor@example.com', status: '' })],
    })
    const pdf = generateRoommateChangePdf(data)
    const text = extractText(pdf)
    expect(pdf.toString('latin1', 0, 8)).toContain('%PDF')
    expect(text).toContain('Roommate Change Request')
    expect(text).toContain('Staying')
    expect(text).toContain('Leaving')
    expect(text).toContain('Moving in')
    expect(text).toContain('Alex Stay')
    expect(text).toContain('Sam Leave')
    expect(text).toContain('Taylor New')
    expect(text).toContain('deposit@groundfloorpm.com')
  })
})
