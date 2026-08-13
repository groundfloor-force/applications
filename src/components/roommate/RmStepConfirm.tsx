'use client'

import { useT } from '@/lib/locale-context'
import { tpl } from '@/lib/i18n'
import {
  incomingPeople,
  joinNames,
  leaving,
  personName,
  staying,
} from '@/lib/roommate-change'
import type { RoommateChangeData, RoommatePerson } from '@/lib/types'

function PersonList({
  people,
  emptyLabel,
}: {
  people: RoommatePerson[]
  emptyLabel: string
}) {
  if (people.length === 0) {
    return <p className="text-sm text-brand-gray">{emptyLabel}</p>
  }
  return (
    <ul className="space-y-2">
      {people.map((p, i) => (
        <li key={i} className="text-sm text-brand-dark">
          <span style={{ fontWeight: 600 }}>{personName(p)}</span>
          <span className="block text-xs text-brand-gray">{p.email} · {p.phone}</span>
        </li>
      ))}
    </ul>
  )
}

export default function RmStepConfirm({
  data,
  onJump,
}: {
  data: RoommateChangeData
  onJump: (step: number) => void
}) {
  const t = useT()
  const stay = staying(data)
  const leave = leaving(data)
  const incoming = incomingPeople(data)
  const andWord = t.common.and

  const staySentence = stay.length === 1
    ? tpl(t.rm.stayOne, { names: joinNames(stay, andWord) })
    : tpl(t.rm.stayMany, { names: joinNames(stay, andWord) })
  const leaveSentence = leave.length === 1
    ? tpl(t.rm.leaveOne, { names: joinNames(leave, andWord) })
    : tpl(t.rm.leaveMany, { names: joinNames(leave, andWord) })
  const inSentence = incoming.length === 0
    ? t.rm.inNone
    : incoming.length === 1
      ? tpl(t.rm.inOne, { names: joinNames(incoming, andWord) })
      : tpl(t.rm.inMany, { names: joinNames(incoming, andWord) })

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        {t.rm.step5Title}
      </h2>
      <p className="text-sm text-brand-gray mb-4">{t.rm.step5Subtitle}</p>

      <p className="text-brand-dark mb-6 leading-relaxed" style={{ fontWeight: 600 }}>
        {staySentence} {leaveSentence} {inSentence}
      </p>

      <div className="space-y-4">
        <section className="bg-white border border-brand-border p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-widest text-green-700" style={{ fontWeight: 700 }}>
              {t.rm.confirmStaying}
            </h3>
            <button type="button" onClick={() => onJump(3)} className="text-xs text-primary-500 hover:underline">
              {t.rm.editSection}
            </button>
          </div>
          <PersonList people={stay} emptyLabel={t.rm.confirmNone} />
        </section>

        <section className="bg-white border border-brand-border p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-widest text-red-700" style={{ fontWeight: 700 }}>
              {t.rm.confirmLeaving}
            </h3>
            <button type="button" onClick={() => onJump(3)} className="text-xs text-primary-500 hover:underline">
              {t.rm.editSection}
            </button>
          </div>
          <PersonList people={leave} emptyLabel={t.rm.confirmNone} />
        </section>

        <section className="bg-white border border-brand-border p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-widest text-primary-700" style={{ fontWeight: 700 }}>
              {t.rm.confirmIncoming}
            </h3>
            <button type="button" onClick={() => onJump(4)} className="text-xs text-primary-500 hover:underline">
              {t.rm.editSection}
            </button>
          </div>
          <PersonList people={incoming} emptyLabel={t.rm.confirmNone} />
        </section>
      </div>
    </div>
  )
}
