'use client'

import { Property } from '@/lib/types'

function Badge({ text }: { text: string }) {
  if (!text) return null
  return (
    <span className="inline-block bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full" style={{ fontWeight: 700 }}>
      {text}
    </span>
  )
}

export default function PropertyCard({
  property,
  selected,
  onClick,
}: {
  property: Property
  selected: boolean
  onClick: () => void
}) {
  const displayAddress = [property.address, property.unit ? `Unit ${property.unit}` : '']
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left  border-2 overflow-hidden transition-all duration-200 hover: focus:outline-none ${
        selected
          ? 'border-primary-500  ring-2 ring-primary-200'
          : 'border-brand-border hover:border-primary-300'
      }`}
    >
      {/* Photo */}
      <div className="relative h-48 bg-brand-bg">
        {property.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.pictureUrl}
            alt={displayAddress}
            className="w-full h-full object-cover"
            onError={(e) => {
              const t = e.currentTarget
              t.style.display = 'none'
              t.parentElement!.classList.add('flex','items-center','justify-center')
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-gray">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full w-7 h-7 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-brand text-base leading-snug mb-1" style={{ fontWeight: 600 }}>
          {displayAddress}
        </h3>
        <p className="text-sm text-brand-gray mb-3">{property.city}</p>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl text-primary-500" style={{ fontWeight: 700 }}>
            ${property.rent.toLocaleString()}
            <span className="text-sm text-brand-gray ml-1" style={{ fontWeight: 400 }}>/mo</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {property.bedrooms && <Badge text={`${property.bedrooms} bed`} />}
          {property.bathrooms && <Badge text={`${property.bathrooms} bath`} />}
          {property.available && <Badge text={`Avail: ${property.available}`} />}
          {property.laundry && <Badge text={property.laundry} />}
          {property.parking && <Badge text={property.parking} />}
          {property.pets && <Badge text={property.pets} />}
          {property.balcony && property.balcony !== 'No' && <Badge text="Balcony" />}
          {property.floor && <Badge text={`Floor ${property.floor}`} />}
        </div>
      </div>
    </button>
  )
}
