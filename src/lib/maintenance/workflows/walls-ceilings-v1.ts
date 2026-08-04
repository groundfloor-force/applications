// ─────────────────────────────────────────────────────────────────────────────
// Walls, ceilings & floors.
//
// Anything water-related hands off to the leak module's "visible damage only"
// branch (q_damage_location → q_damage_wet → q_ceiling_risk), which is already
// exactly the right three questions — no point re-asking them here.
//
// Note: those two cross-links end at q_ceiling_risk → q_media, so they skip
// q_issue_detail. q_comments in the shared tail still catches free text, and
// re-pointing q_ceiling_risk would change the existing leak flow.
// ─────────────────────────────────────────────────────────────────────────────

import type { Question } from '../types'
import { QID, FLAG } from '../ids'
import { opt, TRADE } from './shared'

export const WALL = {
  WHAT: 'q_wall_what',
  EXTERIOR: 'q_wall_exterior',
  SAFETY: 'q_wall_safety',
} as const

export const wallsCeilingsQuestions: Question[] = [
  {
    id: WALL.WHAT,
    section: 'issue',
    text: 'What are you reporting?',
    inputType: 'single_choice',
    options: [
      { value: 'ceiling_fallen', label: 'Part of the ceiling has come down', goto: WALL.SAFETY, action: { setPriority: 'P1', emergency: true, emergencyType: 'Ceiling collapse', safetyFlags: [FLAG.CEILING_COLLAPSE], damageRisk: 'high' } },
      { value: 'ceiling_sagging', label: 'Ceiling sagging, bubbling, or bulging', goto: QID.DAMAGE_LOCATION, action: { setPriority: 'P2', safetyFlags: [FLAG.CEILING_COLLAPSE_RISK], damageRisk: 'high' } },
      { value: 'water_stain', label: 'Water stain or discolouration', goto: QID.DAMAGE_LOCATION, action: { setPriority: 'P2', damageRisk: 'moderate' } },
      { value: 'mold', label: 'Mold or mildew', action: { setPriority: 'P2', safetyFlags: [FLAG.POSSIBLE_MOLD], coordinatorReview: true } },
      { value: 'hole_damage', label: 'A hole or damage in a wall or ceiling', action: { setPriority: 'P3', suggestedTrade: TRADE.DRYWALL } },
      { value: 'crack', label: 'A crack in a wall or ceiling', action: { setPriority: 'P3', suggestedTrade: TRADE.DRYWALL } },
      { value: 'floor_soft', label: 'Soft, sagging, or spongy floor', action: { setPriority: 'P2', safetyFlags: [FLAG.STRUCTURAL_CONCERN] } },
      { value: 'peeling', label: 'Peeling paint or wallpaper', action: { setPriority: 'P3' } },
      opt('other', 'Something else'),
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: WALL.WHAT, op: 'in', value: ['ceiling_fallen', 'ceiling_sagging'] }, text: 'Stay clear of the area and do not stand underneath it.' },
      { level: 'warning', when: { questionId: WALL.WHAT, op: 'eq', value: 'floor_soft' }, text: 'Keep off the soft area and keep children and pets away from it until we have looked at it.' },
    ],
    next: [{ goto: WALL.EXTERIOR }],
  },

  {
    id: WALL.EXTERIOR,
    section: 'issue',
    text: 'Does the damage go all the way through to the outside?',
    inputType: 'single_choice',
    visibleIf: { questionId: WALL.WHAT, op: 'in', value: ['hole_damage', 'crack'] },
    options: [
      // Heat loss, water ingress and pests — all three at once, in winter.
      { value: 'yes', label: 'Yes', action: { setPriority: 'P2', safetyFlags: [FLAG.EXTERIOR_BREACH] } },
      opt('no', 'No'),
      opt('unsure', 'Unsure'),
    ],
    // Skippable — needs an unconditional rule.
    next: [{ goto: QID.ISSUE_DETAIL }],
  },

  {
    id: WALL.SAFETY,
    section: 'issue',
    text: 'Is anyone at risk from it right now?',
    inputType: 'single_choice',
    emergencyBanner: true,
    options: [
      { value: 'someone_hurt', label: 'Someone was hurt', action: { setPriority: 'P1', emergency: true, emergencyType: 'Injury', safetyFlags: [FLAG.INJURY] } },
      { value: 'cannot_avoid', label: 'No one is hurt, but it is in a room we have to use', action: { setPriority: 'P1', safetyFlags: [FLAG.UNSAFE_LIVING_SPACE] } },
      { value: 'area_clear', label: 'We are keeping clear of the area', action: { setPriority: 'P2' } },
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: WALL.SAFETY, op: 'eq', value: 'someone_hurt' }, text: 'If anyone is injured, call 911 now. Then call us at 506 204 8440.' },
      { level: 'danger', text: 'Do not stand underneath the damaged area, and keep children and pets out of the room.' },
    ],
    next: [{ goto: QID.MEDIA }],
  },
]
