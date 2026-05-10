import { jsPDF } from 'jspdf'
import type { FormData } from './types'

export function generateApplicationPdf(data: Omit<FormData, 'payStubFile'>): Buffer {
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
