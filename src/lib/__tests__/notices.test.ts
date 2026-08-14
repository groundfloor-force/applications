import { describe, it, expect } from 'vitest'
import {
  validateNotice,
  parseUnitName,
  buildNoticeColumnValues,
  buildRoommateNoticeColumnValues,
  noticeItemName,
  roommateNoticeItemName,
  NOTICE_REASON_OTHER,
  NOTICES_FORWARDING_ADDRESS_COLUMN_ID,
  NOTICES_TYPE_ROOMMATE_CHANGE,
  type NoticeFormData,
} from '../notices'

const VALID: NoticeFormData = {
  unitId: '11476729877',
  unitName: '21 Newcombe Dr - 106',
  moveOutDate: '2026-08-31',
  fullName: 'Test Tenant',
  email: 'tenant@test.com',
  reason: 'Purchased a home',
  details: '',
  forwardingAddress: '99 New Home St, Moncton, NB',
  forwardingPostal: 'E1A 1A1',
  occupantsMoving: 'Yes - All occupants are moving out',
  roommateDetails: '',
  signatureData: 'data:image/png;base64,iVBORw0KGgo=',
}

describe('validateNotice', () => {
  it('accepts a complete valid notice', () => {
    expect(validateNotice(VALID)).toEqual({})
  })

  it('requires unit, date, name, email, reason, occupants, signature', () => {
    const e = validateNotice({
      ...VALID,
      unitId: '',
      unitName: '',
      moveOutDate: '',
      fullName: '',
      email: '',
      reason: '',
      occupantsMoving: '',
      signatureData: '',
    })
    for (const k of ['unitId', 'moveOutDate', 'fullName', 'email', 'reason', 'occupantsMoving', 'signatureData']) {
      expect(e, k).toHaveProperty(k)
    }
  })

  it('requires details only when reason is Other', () => {
    expect(validateNotice({ ...VALID, reason: NOTICE_REASON_OTHER, details: '' })).toHaveProperty('details')
    expect(validateNotice({ ...VALID, reason: NOTICE_REASON_OTHER, details: 'Renovating' })).toEqual({})
    expect(validateNotice({ ...VALID, details: '' })).toEqual({})
  })

  it('rejects malformed email, date, and unknown option values', () => {
    expect(validateNotice({ ...VALID, email: 'not-an-email' })).toHaveProperty('email')
    expect(validateNotice({ ...VALID, moveOutDate: '31-08-2026' })).toHaveProperty('moveOutDate')
    expect(validateNotice({ ...VALID, reason: 'Eviction' })).toHaveProperty('reason')
    expect(validateNotice({ ...VALID, occupantsMoving: 'Maybe' })).toHaveProperty('occupantsMoving')
  })
})

describe('parseUnitName', () => {
  it('splits "address - unit" on the last spaced hyphen', () => {
    expect(parseUnitName('21 Newcombe Dr - 106')).toEqual({ address: '21 Newcombe Dr', unit: '106' })
    expect(parseUnitName('29-79 Rue Des Eleves - 75')).toEqual({ address: '29-79 Rue Des Eleves', unit: '75' })
    expect(parseUnitName('699 Route 133 - Garage')).toEqual({ address: '699 Route 133', unit: 'Garage' })
  })

  it('returns whole name as address when there is no unit suffix', () => {
    expect(parseUnitName('62 Steadman Street')).toEqual({ address: '62 Steadman Street', unit: '' })
  })
})

describe('buildNoticeColumnValues', () => {
  it('maps all fields to the Notices board columns', () => {
    const cv = buildNoticeColumnValues(VALID)
    expect(cv.status).toEqual({ label: '*NEW' })
    expect(cv.type).toEqual({ label: 'Move Out' })
    expect(cv.date).toEqual({ date: '2026-08-31' })
    expect(cv.text0).toBe('Test Tenant')
    expect(cv.text2).toBe('tenant@test.com')
    expect(cv.dropdown__1).toEqual({ labels: ['Purchased a home'] })
    expect(cv.text5).toBe('21 Newcombe Dr')
    expect(cv.text00).toBe('106')
    expect(cv.board_relation_mm1jz4k6).toEqual({ item_ids: [11476729877] })
    expect(cv.dropdown_mm544ttk).toEqual({ labels: ['Yes - All occupants are moving out'] })
    expect(cv[NOTICES_FORWARDING_ADDRESS_COLUMN_ID]).toBe('99 New Home St, Moncton, NB')
    expect(cv.text_mm546cmt).toBe('E1A 1A1')
    expect(cv.date8).toHaveProperty('date')
  })

  it('omits empty optional columns', () => {
    const cv = buildNoticeColumnValues({
      ...VALID,
      details: '',
      roommateDetails: '',
      forwardingAddress: '',
      forwardingPostal: '',
    })
    expect(cv).not.toHaveProperty('long_text')
    expect(cv).not.toHaveProperty('text_mm542y9p')
    expect(cv).not.toHaveProperty(NOTICES_FORWARDING_ADDRESS_COLUMN_ID)
    expect(cv).not.toHaveProperty('text_mm546cmt')
  })
})

describe('noticeItemName', () => {
  it('combines unit name and tenant name', () => {
    expect(noticeItemName(VALID)).toBe('21 Newcombe Dr - 106 - Test Tenant')
  })
})

describe('roommate notice mapping', () => {
  it('names the item as address and unit only', () => {
    expect(roommateNoticeItemName('21 Newcombe Dr - 106')).toBe('21 Newcombe Dr - 106')
  })

  it('maps name, email, phone, and move-out date onto Notices columns', () => {
    const cv = buildRoommateNoticeColumnValues({
      unitId: '11476729877',
      unitName: '21 Newcombe Dr - 106',
      moveOutDate: '2026-09-01',
      fullName: 'Sam Leave',
      email: 'sam@example.com',
      phone: '506-555-1000',
      stayingNames: 'Alex Stay',
      leavingNames: 'Sam Leave',
    })
    expect(cv.text0).toBe('Sam Leave')
    expect(cv.text2).toBe('sam@example.com')
    expect(cv.date).toEqual({ date: '2026-09-01' })
    expect(cv.long_text.text).toContain('506-555-1000')
    expect(cv.color_mm66empx).toEqual({ label: NOTICES_TYPE_ROOMMATE_CHANGE })
    expect(cv.dropdown__1).toEqual({ labels: ['Separation/Roommate Issues'] })
    expect(cv.dropdown_mm544ttk).toEqual({ labels: ['No - My roommate wishes to keep the apartment'] })
    expect(cv.text5).toBe('21 Newcombe Dr')
    expect(cv.text00).toBe('106')
    expect(cv.board_relation_mm1jz4k6).toEqual({ item_ids: [11476729877] })
    expect(cv.text_mm542y9p).toContain('Alex Stay')
  })
})
