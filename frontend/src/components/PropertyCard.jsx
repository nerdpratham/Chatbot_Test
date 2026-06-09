import './PropertyCard.css'

function formatPrice(rupees) {
  if (rupees == null) return 'Price N/A'
  if (rupees >= 10000000) {
    const cr = (rupees / 10000000).toFixed(2).replace(/\.?0+$/, '')
    return `₹${cr} Cr`
  }
  if (rupees >= 100000) {
    const lakh = (rupees / 100000).toFixed(2).replace(/\.?0+$/, '')
    return `₹${lakh} Lakh`
  }
  return `₹${rupees}`
}

function formatMetro(metres) {
  if (metres == null) return null
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km from metro` : `${metres}m from metro`
}

export default function PropertyCard({ property: p }) {
  const availability = p.status === 'ready-to-move'
    ? 'Ready to move'
    : `Possession ${p.possession ?? 'TBD'}`
  const metro = formatMetro(p.distanceToMetroM)

  return (
    <div className="property-card">
      <div className="property-card-head">
        <h3 className="property-name">{p.project}</h3>
        <span className={`property-badge ${p.status === 'ready-to-move' ? 'ready' : 'soon'}`}>
          {p.status === 'ready-to-move' ? 'Ready' : 'New'}
        </span>
      </div>

      <p className="property-location">
        {[p.locality, p.city].filter(Boolean).join(', ')}
      </p>

      <div className="property-specs">
        <span>{p.bhk} BHK</span>
        <span className="dot">·</span>
        <span className="property-price">{formatPrice(p.price)}</span>
        <span className="dot">·</span>
        <span>{p.areaSqft} sq.ft</span>
      </div>

      <p className="property-availability">
        {availability}{metro ? <> · {metro}</> : null}
      </p>

      {(p.source || p.lastChecked) && (
        <p className="property-source">
          {p.source && <>Source: {p.source}</>}
          {p.source && p.lastChecked && ' · '}
          {p.lastChecked && <>Last checked: {p.lastChecked}</>}
        </p>
      )}

      <div className="property-actions">
        <button className="prop-btn primary">View Details</button>
        <button className="prop-btn">Compare</button>
        <button className="prop-btn">Book Visit</button>
      </div>
    </div>
  )
}
