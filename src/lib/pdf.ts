import { jsPDF } from 'jspdf'
import type { FormData } from './types'

export function generateApplicationPdf(data: Omit<FormData, 'documents' | 'occupantDocs'>): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 20

  function checkPage(needed = 12) {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      y = 20
    }
  }

  function heading(text: string) {
    checkPage(16)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 90, 163)
    doc.text(text, margin, y)
    y += 2
    doc.setDrawColor(0, 90, 163)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + contentWidth, y)
    y += 8
  }

  function label(lbl: string, val: string) {
    checkPage()
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 112, 141)
    doc.text(lbl, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(17, 17, 17)
    doc.text(val || '—', margin + 55, y)
    y += 6
  }

  function spacer(h = 4) { y += h }

  const { property, occupants = [] } = data

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 90, 163)
  doc.text('Rental Application', margin, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 112, 141)
  doc.text(`Ground Floor Property Management — Submitted ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y)
  y += 12

  // Property
  if (property) {
    heading('Property')
    label('Address', `${property.address}${property.unit ? `, Unit ${property.unit}` : ''}`)
    label('City', property.city)
    label('Monthly Rent', property.rent > 0 ? `$${property.rent.toLocaleString()}` : '—')
    label('Bedrooms', property.bedrooms)
    label('Bathrooms', property.bathrooms)
    spacer()
  }

  // Primary Applicant
  heading('Primary Applicant')
  label('Name', `${data.firstName} ${data.lastName}`)
  label('Email', data.email)
  label('Phone', data.phone)
  label('Date of Birth', data.birthDate)
  label('Current Address', [data.currentAddress, data.currentAddressLine2, data.currentCity, data.currentProvince, data.currentPostal].filter(Boolean).join(', '))
  label('Children', data.children || 'None')
  label('Pets', data.pets || 'None')
  spacer()

  // Viewing
  heading('Unit Viewing')
  label('Viewed Unit', data.viewedUnit)
  if (data.viewedByName) {
    label('Shown By', data.viewedByName)
  }
  spacer()

  // Leasing Details
  heading('Leasing Details')
  label('Leasing Agent', data.leasingAgent)
  label('Monthly Rent', data.monthlyRent ? `$${data.monthlyRent}` : '—')
  label('Security Deposit', data.securityDeposit ? `$${data.securityDeposit}` : '—')
  label('Move-In Date', data.moveInDate)
  label('Adults (18+)', String(data.numOccupants))
  label('Vehicles', data.numVehicles)
  spacer()

  // Employment
  heading('Employment (Primary)')
  label('Employer', data.employerName)
  spacer()

  // Rental History
  heading('Rental History')
  label('Previous Landlord', `${data.prevLandlordFirstName} ${data.prevLandlordLastName}`.trim())
  label('Landlord Phone', data.prevLandlordPhone)
  label('Landlord Email', data.prevLandlordEmail)
  label('Previous Rent', data.prevMonthlyRent ? `$${data.prevMonthlyRent}/mo` : '—')
  label('Rented From', data.rentedFrom)
  label('Rented To', data.rentedTo || 'Current')
  label('Reason for Leaving', data.reasonForLeaving)
  spacer()

  // References
  heading('References')
  label('Reference', `${data.ref1FirstName} ${data.ref1LastName}`.trim())
  label('Phone', data.ref1Phone)
  label('Email', data.ref1Email)
  spacer()

  // Cosigner
  if (data.cosignerFirstName) {
    heading('Co-signer')
    label('Name', `${data.cosignerFirstName} ${data.cosignerLastName}`.trim())
    label('Relationship', data.cosignerRelationship)
    label('Email', data.cosignerEmail)
    label('Phone', data.cosignerPhone)
    spacer()
  }

  // Additional Occupants
  if (occupants.length > 0) {
    heading('Additional Occupants')
    occupants.forEach((occ, i) => {
      checkPage(50)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 17, 17)
      doc.text(`Occupant ${i + 2}`, margin, y)
      y += 7
      label('Name', `${occ.firstName} ${occ.lastName}`)
      label('Email', occ.email)
      label('Phone', occ.phone)
      label('Date of Birth', occ.birthDate)
      label('Relationship', occ.relationship)
      label('Occupation', occ.occupation)
      label('Employer', occ.employerName)
      label('Position', occ.positionHeld)
      label('Employer Address', [occ.employerAddress, occ.employerCity, occ.employerProvince, occ.employerPostal].filter(Boolean).join(', '))
      label('Employer Phone', occ.employerPhone)
      label('Employment Period', `${occ.employmentFrom || '—'} to ${occ.employmentTo || 'Current'}`)
      label('Monthly Gross', occ.monthlyGrossSalary ? `$${occ.monthlyGrossSalary}` : '—')
      if (occ.sameAsPrimary === false) {
        label('Current Address', [occ.currentAddress, occ.currentAddressLine2, occ.currentCity, occ.currentProvince, occ.currentPostal].filter(Boolean).join(', '))
        label('Prev. Landlord', `${occ.prevLandlordFirstName || ''} ${occ.prevLandlordLastName || ''}`.trim())
        label('Landlord Phone', occ.prevLandlordPhone || '')
        label('Landlord Email', occ.prevLandlordEmail || '')
        label('Reason for Leaving', occ.prevReasonForLeaving || '')
      } else {
        label('Address & Landlord', 'Same as primary applicant')
      }
      spacer(6)
    })
  }

  // Additional Details
  if (data.additionalDetails) {
    heading('Additional Details')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(17, 17, 17)
    const lines = doc.splitTextToSize(data.additionalDetails, contentWidth)
    checkPage(lines.length * 5)
    doc.text(lines, margin, y)
    y += lines.length * 5
  }

  // Convert to Buffer
  const arrayBuf = doc.output('arraybuffer')
  return Buffer.from(arrayBuf)
}

// ── Blank printable application ──────────────────────────────────────────────

export function generateBlankApplicationPdf(): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  let y = 18

  function checkPage(needed = 12) {
    if (y + needed > pageHeight - 18) {
      doc.addPage()
      y = 18
    }
  }

  function heading(text: string) {
    checkPage(16)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 90, 163)
    doc.text(text, margin, y)
    y += 2
    doc.setDrawColor(0, 90, 163)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + contentWidth, y)
    y += 7
  }

  function fieldLine(lbl: string, lineWidth = contentWidth) {
    checkPage(10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 112, 141)
    doc.text(lbl, margin, y)
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.2)
    const labelWidth = doc.getTextWidth(lbl) + 3
    doc.line(margin + labelWidth, y + 1, margin + lineWidth, y + 1)
    y += 7
  }

  function fieldRow(fields: { label: string; width?: number }[]) {
    checkPage(10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 112, 141)
    const gutter = 4
    const totalSpec = fields.reduce((s, f) => s + (f.width ?? 1), 0)
    const usable = contentWidth - gutter * (fields.length - 1)
    let x = margin
    fields.forEach((f) => {
      const w = ((f.width ?? 1) / totalSpec) * usable
      doc.setFont('helvetica', 'bold')
      doc.text(f.label, x, y)
      const labelW = doc.getTextWidth(f.label) + 3
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.2)
      doc.line(x + labelW, y + 1, x + w, y + 1)
      x += w + gutter
    })
    y += 7
  }

  function checkboxRow(label: string, options: string[]) {
    checkPage(10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 112, 141)
    doc.text(label, margin, y)
    const labelW = doc.getTextWidth(label) + 4
    let x = margin + labelW
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    options.forEach((opt) => {
      doc.setDrawColor(120, 120, 120)
      doc.setLineWidth(0.3)
      doc.rect(x, y - 3, 3.5, 3.5)
      doc.text(opt, x + 5, y)
      x += 5 + doc.getTextWidth(opt) + 6
    })
    y += 7
  }

  function spacer(h = 3) { y += h }

  function note(text: string) {
    checkPage(8)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(120, 120, 120)
    const lines = doc.splitTextToSize(text, contentWidth)
    doc.text(lines, margin, y)
    y += lines.length * 4 + 2
  }

  // ── Title ──
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 90, 163)
  doc.text('Rental Application', margin, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 112, 141)
  doc.text('Ground Floor Property Management', margin, y)
  y += 5
  doc.setFontSize(8)
  doc.text('Please complete all sections. Return to your leasing agent or email tony@groundfloorpm.com.', margin, y)
  y += 8

  // ── Property ──
  heading('Property Applied For')
  fieldRow([{ label: 'Address:', width: 3 }, { label: 'Unit:', width: 1 }])
  fieldRow([{ label: 'City:', width: 2 }, { label: 'Postal Code:', width: 1 }])
  fieldRow([{ label: 'Requested Move-In Date:', width: 1 }, { label: 'Monthly Rent: $', width: 1 }, { label: 'Security Deposit: $', width: 1 }])
  fieldLine('Leasing Agent (or "N/A"):')
  checkboxRow('Viewed Unit:', ['In Person', 'Virtual Tour', 'No'])
  fieldLine('If viewed, who showed it:')
  spacer()

  // ── Primary Applicant ──
  heading('Primary Applicant')
  fieldRow([{ label: 'First Name:' }, { label: 'Last Name:' }])
  fieldRow([{ label: 'Email:', width: 2 }, { label: 'Phone:', width: 1 }])
  fieldRow([{ label: 'Date of Birth:' }, { label: 'Number of Children:' }, { label: 'Pets:' }])
  fieldLine('Current Street Address:')
  fieldRow([{ label: 'Apt/Unit:' }, { label: 'City:' }, { label: 'Province:' }, { label: 'Postal:' }])
  spacer()

  // ── Household Details ──
  heading('Household Details')
  fieldRow([{ label: 'Number of Adults (18+):' }, { label: 'Number of Vehicles:' }])
  spacer()

  // ── Additional Occupants (3 blank slots) ──
  for (let i = 0; i < 3; i++) {
    heading(`Additional Occupant ${i + 1}`)
    fieldRow([{ label: 'First Name:' }, { label: 'Last Name:' }])
    fieldRow([{ label: 'Email:', width: 2 }, { label: 'Phone:', width: 1 }])
    fieldRow([{ label: 'Date of Birth:' }, { label: 'Relationship:' }, { label: 'Occupation:' }])
    fieldRow([{ label: 'Employer:', width: 2 }, { label: 'Position:', width: 1 }])
    fieldLine('Employer Address:')
    fieldRow([{ label: 'City:' }, { label: 'Province:' }, { label: 'Postal:' }, { label: 'Employer Phone:' }])
    fieldRow([{ label: 'Employment From:' }, { label: 'To (or "Current"):' }, { label: 'Monthly Gross: $' }])
    spacer()
  }

  // ── Rental History ──
  heading('Rental History (Previous Landlord)')
  note('First rental? Enter your parent/guardian and write "First Rental" in Reason for Leaving. Homeowner? List yourself as landlord and note "Homeowner" or "Sold Home".')
  fieldRow([{ label: 'Landlord First Name:' }, { label: 'Landlord Last Name:' }])
  fieldRow([{ label: 'Landlord Phone:' }, { label: 'Landlord Email:' }])
  fieldRow([{ label: 'Previous Monthly Rent: $' }, { label: 'Rented From:' }, { label: 'Rented To:' }])
  fieldLine('Reason for Leaving:')
  fieldLine('')
  spacer()

  // ── Employment (Primary) ──
  heading('Employment (Primary Applicant)')
  fieldLine('Employer Name (or "Unemployed" / "Retired"):')
  spacer()

  // ── References ──
  heading('References')
  fieldRow([{ label: 'Reference First Name:' }, { label: 'Reference Last Name:' }])
  fieldRow([{ label: 'Reference Phone:' }, { label: 'Reference Email:' }])
  spacer()

  // ── Co-signer ──
  heading('Co-signer (if applicable)')
  fieldRow([{ label: 'First Name:' }, { label: 'Last Name:' }])
  fieldRow([{ label: 'Relationship:' }, { label: 'Phone:' }])
  fieldLine('Email:')
  spacer()

  // ── Additional Details ──
  heading('Additional Details')
  for (let i = 0; i < 4; i++) fieldLine('')
  spacer()

  // ── Signature ──
  checkPage(30)
  heading('Acknowledgement')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  const ack = doc.splitTextToSize(
    'I certify that the information provided in this application is true and complete to the best of my knowledge. I authorize Ground Floor Property Management to verify any information contained herein, including but not limited to employment, rental history, references, and credit checks.',
    contentWidth
  )
  doc.text(ack, margin, y)
  y += ack.length * 4 + 6
  fieldRow([{ label: 'Applicant Signature:', width: 2 }, { label: 'Date:', width: 1 }])

  const arrayBuf = doc.output('arraybuffer')
  return Buffer.from(arrayBuf)
}
