// Canonical section list. A section is a PROGRESS PHASE, not a taxonomy — the
// intake progress bar is computed from a question's position in this order, so
// adding a section per issue category would make the bar jump around. New
// category questions belong in `issue`.
//
// Single source of truth for the intake progress bar, the review screen's
// grouping, and the admin editor's section picker.

export const SECTIONS: { key: string; title: string }[] = [
  { key: 'issue', title: 'The issue' },
  { key: 'appliance', title: 'Appliance details' },
  { key: 'media', title: 'Photos' },
  { key: 'contact', title: 'Your contact details' },
  { key: 'property', title: 'Property' },
  { key: 'access', title: 'Access' },
  { key: 'comments', title: 'Additional details' },
]

export const SECTION_ORDER = SECTIONS.map((s) => s.key)
