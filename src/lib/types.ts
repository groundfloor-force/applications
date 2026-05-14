export interface Property {
  id: string
  name: string
  address: string
  unit: string
  city: string
  postal: string
  rent: number
  bedrooms: string
  bathrooms: string
  pictureUrl: string
  available: string
  laundry: string
  parking: string
  pets: string
  balcony: string
  floor: string
  status: string
}

export interface ChildDetail {
  name: string
  birthDate: string
}

export interface Occupant {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  relationship: string
  occupation: string
  employerName: string
  employerAddress: string
  employerAddressLine2: string
  employerCity: string
  employerProvince: string
  employerPostal: string
  employerPhone: string
  employmentFrom: string
  employmentTo: string
  monthlyGrossSalary: string
  positionHeld: string
  // Roommate-vs-family flow: if false, this occupant has their own
  // current address and previous landlord reference (captured below).
  sameAsPrimary: boolean
  currentAddress: string
  currentAddressLine2: string
  currentCity: string
  currentProvince: string
  currentPostal: string
  prevLandlordFirstName: string
  prevLandlordLastName: string
  prevLandlordPhone: string
  prevLandlordEmail: string
  prevReasonForLeaving: string
}

export interface FormData {
  // Step 1 — selected properties in order of preference.
  // `property` is kept in sync with `properties[0]` for downstream compatibility.
  property: Property | null
  properties: Property[]

  // Step 2 – Primary Applicant
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  currentAddress: string
  currentAddressLine2: string
  currentCity: string
  currentProvince: string
  currentPostal: string
  children: string
  childrenList: ChildDetail[]
  pets: string
  petPhotos: File[]

  // Step 3 – Household Details
  leasingAgent: string
  securityDeposit: string
  monthlyRent: string
  numOccupants: number
  numVehicles: string
  moveInDate: string
  viewedUnit: string
  viewedByName: string

  // Step 4 – Additional Occupants
  occupants: Occupant[]

  // Step 5 – Rental History
  prevLandlordFirstName: string
  prevLandlordLastName: string
  prevMonthlyRent: string
  rentedFrom: string
  rentedTo: string
  reasonForLeaving: string
  prevLandlordPhone: string
  prevLandlordEmail: string

  // Step 6 – Employment
  employerName: string
  documents: File[]
  occupantDocs: File[][]

  // Step 7 – References + Cosigner
  ref1FirstName: string
  ref1LastName: string
  ref1Phone: string
  ref1Email: string
  cosignerFirstName: string
  cosignerLastName: string
  cosignerRelationship: string
  cosignerEmail: string
  cosignerPhone: string
  cosignerDocs: File[]

  // Step 8
  supportingDocs: File[]
  additionalDetails: string
  termsAgreed: boolean
}

export interface FormConfig {
  formOpen: boolean
  companyName: string
  logoUrl: string
  termsText: string
  termsTextFr: string
  notificationEmail: string
  closedMessage: string
}

export const emptyOccupant = (): Occupant => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  relationship: '',
  occupation: '',
  employerName: '',
  employerAddress: '',
  employerAddressLine2: '',
  employerCity: '',
  employerProvince: '',
  employerPostal: '',
  employerPhone: '',
  employmentFrom: '',
  employmentTo: '',
  monthlyGrossSalary: '',
  positionHeld: '',
  sameAsPrimary: true,
  currentAddress: '',
  currentAddressLine2: '',
  currentCity: '',
  currentProvince: '',
  currentPostal: '',
  prevLandlordFirstName: '',
  prevLandlordLastName: '',
  prevLandlordPhone: '',
  prevLandlordEmail: '',
  prevReasonForLeaving: '',
})

export const initialFormData: FormData = {
  property: null,
  properties: [],
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  currentAddress: '',
  currentAddressLine2: '',
  currentCity: '',
  currentProvince: '',
  currentPostal: '',
  children: '',
  childrenList: [],
  pets: '',
  petPhotos: [],
  leasingAgent: '',
  securityDeposit: '',
  monthlyRent: '',
  numOccupants: 1,
  numVehicles: '',
  moveInDate: '',
  viewedUnit: '',
  viewedByName: '',
  occupants: [],
  prevLandlordFirstName: '',
  prevLandlordLastName: '',
  prevMonthlyRent: '',
  rentedFrom: '',
  rentedTo: '',
  reasonForLeaving: '',
  prevLandlordPhone: '',
  prevLandlordEmail: '',
  employerName: '',
  documents: [],
  occupantDocs: [],
  ref1FirstName: '',
  ref1LastName: '',
  ref1Phone: '',
  ref1Email: '',
  cosignerFirstName: '',
  cosignerLastName: '',
  cosignerRelationship: '',
  cosignerEmail: '',
  cosignerPhone: '',
  cosignerDocs: [],
  supportingDocs: [],
  additionalDetails: '',
  termsAgreed: false,
}
