import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildFullDetails,
  buildIntakePayload,
  postApplicationIntake,
  type IntakeFormData,
} from '@/lib/lighthouse-intake'
import { initialFormData, emptyOccupant } from '@/lib/types'

function sampleData(overrides: Partial<IntakeFormData> = {}): IntakeFormData {
  const { documents: _d, occupantDocs: _o, ...base } = initialFormData
  return {
    ...base,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '5065550100',
    monthlyRent: '1,500',
    securityDeposit: '1500',
    moveInDate: '2026-10-01',
    property: {
      id: 'monday-vacancy-1',
      name: '129 Birchmount - 2',
      address: '129 Birchmount',
      unit: '2',
      city: 'Saint John',
      postal: 'E2K 1A1',
      rent: 1500,
      bedrooms: '2',
      bathrooms: '1',
      pictureUrl: '',
      available: '',
      laundry: '',
      parking: '',
      pets: '',
      balcony: '',
      floor: '',
      status: 'VACANT',
    },
    ...overrides,
  }
}

describe('buildIntakePayload', () => {
  it('maps core fields and reuses the Monday application UUID', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const payload = buildIntakePayload(sampleData(), id, 'en')

    expect(payload.applicationId).toBe(id)
    expect(payload.name).toBe('Jane Doe')
    expect(payload.language).toBe('en')
    expect(payload.unit).toEqual({
      addressText: '129 Birchmount',
      unitNumber: '2',
      city: 'Saint John',
      province: 'NB',
      postalCode: 'E2K 1A1',
    })
    expect(payload.unit).not.toHaveProperty('rentvineUnitId')
    expect(payload.rent).toBe(1500)
    expect(payload.securityDeposit).toBe(1500)
    expect(payload.moveInDate).toBe('2026-10-01')
    expect(payload.submittedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(payload.occupants).toEqual([
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '5065550100',
      },
    ])
    expect(payload.incomeVerification).toEqual({})
    expect(payload.fullDetails).toContain('Jane Doe')
    expect(payload.fullDetails!.length).toBeLessThanOrEqual(100_000)
  })

  it('caps occupants at 3 (primary + 2 extras) and accepts fr', () => {
    const occ = [
      { ...emptyOccupant(), firstName: 'A', lastName: 'Two', email: 'a@x.com', phone: '1' },
      { ...emptyOccupant(), firstName: 'B', lastName: 'Three', email: 'b@x.com', phone: '2' },
      { ...emptyOccupant(), firstName: 'C', lastName: 'Four', email: 'c@x.com', phone: '3' },
    ]
    const payload = buildIntakePayload(sampleData({ occupants: occ }), crypto.randomUUID(), 'fr')
    expect(payload.language).toBe('fr')
    expect(payload.occupants).toHaveLength(3)
    expect(payload.occupants[2].firstName).toBe('B')
  })

  it('includes multi-property preference list in fullDetails', () => {
    const data = sampleData({
      properties: [
        sampleData().property!,
        {
          ...sampleData().property!,
          id: '2',
          address: '250 Mill Road',
          unit: '1',
        },
      ],
    })
    const text = buildFullDetails(data)
    expect(text).toContain('1st choice')
    expect(text).toContain('2nd choice')
    expect(text).toContain('250 Mill Road')
  })
})

describe('postApplicationIntake', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns null when env is not configured', async () => {
    vi.stubEnv('APPLICATIONS_INTAKE_SECRET', '')
    vi.stubEnv('APPLICATIONS_INTAKE_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await postApplicationIntake(
      buildIntakePayload(sampleData(), crypto.randomUUID(), 'en'),
    )
    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts Bearer auth and returns id / portalUrl', async () => {
    vi.stubEnv('APPLICATIONS_INTAKE_SECRET', 'test-secret')
    vi.stubEnv('APPLICATIONS_INTAKE_URL', 'https://example.test/api/applications/intake')

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1234,
          applicationId: '550e8400-e29b-41d4-a716-446655440000',
          portalUrl: 'https://example.test/apply/tok',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const payload = buildIntakePayload(
      sampleData(),
      '550e8400-e29b-41d4-a716-446655440000',
      'en',
    )
    const result = await postApplicationIntake(payload)

    expect(result).toEqual({
      id: 1234,
      applicationId: '550e8400-e29b-41d4-a716-446655440000',
      portalUrl: 'https://example.test/apply/tok',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/applications/intake')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer test-secret')
    expect(init.headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(init.body)
    expect(body.applicationId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('retries once on 429 then succeeds', async () => {
    vi.stubEnv('APPLICATIONS_INTAKE_SECRET', 'test-secret')
    vi.stubEnv('APPLICATIONS_INTAKE_URL', 'https://example.test/api/applications/intake')

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Retry-After': '0' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 99, applicationId: 'x' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await postApplicationIntake(
      buildIntakePayload(sampleData(), crypto.randomUUID(), 'en'),
    )
    expect(result?.id).toBe(99)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries once on 500 then throws if still failing', async () => {
    vi.stubEnv('APPLICATIONS_INTAKE_SECRET', 'test-secret')
    vi.stubEnv('APPLICATIONS_INTAKE_URL', 'https://example.test/api/applications/intake')

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'Intake failed' }), { status: 500 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      postApplicationIntake(buildIntakePayload(sampleData(), crypto.randomUUID(), 'en')),
    ).rejects.toThrow(/Lighthouse intake failed \(500\)/)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
