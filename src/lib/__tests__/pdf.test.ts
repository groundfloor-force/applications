import { describe, it, expect } from 'vitest'
import { inflateSync } from 'zlib'
import { generateApplicationPdf } from '../pdf'
import { initialFormData } from '../types'
import type { FormData } from '../types'

const LONG_REASON =
  'It is family as I had a discount but no signed paper work as I moved in with significant other so I was on and off renting here and was second party on lease at Millennium Boulevard for a year in 2024-2025.'

function buildData(): Omit<FormData, 'documents' | 'occupantDocs'> {
  return {
    ...initialFormData,
    firstName: 'Test',
    lastName: 'Applicant',
    email: 'test@test.com',
    phone: '5061234567',
    reasonForLeaving: LONG_REASON,
    property: {
      id: '1',
      address: '250 Mill Road',
      unit: '1',
      city: 'Moncton',
      postal: 'E1A 1A1',
      rent: 1500,
      bedrooms: '2',
      bathrooms: '1',
    } as FormData['property'],
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

describe('generateApplicationPdf', () => {
  it('wraps long answers instead of clipping them off the page edge', () => {
    const pdf = generateApplicationPdf(buildData())
    const text = extractText(pdf)
    // wrapped output splits the value across multiple Tj ops; every word must survive
    const flattened = text.replace(/\s+/g, ' ')
    expect(flattened).toContain('second party on lease at Millennium Boulevard')
    expect(flattened).toContain('2024-2025.')
    // no single text op should be wider than the printable area (~90 chars at 9pt)
    const lines = text.split('\n').filter(Boolean)
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(120)
  })

  it('produces a compressed multi-section PDF small enough for reliable previews', () => {
    const pdf = generateApplicationPdf(buildData())
    expect(pdf.toString('latin1', 0, 8)).toContain('%PDF')
    expect(pdf.toString('latin1')).toContain('FlateDecode')
    expect(pdf.length).toBeLessThan(200_000)
  })
})
