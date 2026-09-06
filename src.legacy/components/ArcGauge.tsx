import { memo, useMemo } from 'react'

export interface GaugeSegment {
  value: number
  color: 'green' | 'dark' | 'muted'
  label?: string
  caption?: string
}

interface ArcGaugeProps {
  /** 0–100 total filled amount (used for center headline) */
  value: number
  segments: GaugeSegment[]
  size?: number
  strokeWidth?: number
  headline?: string
  subhead?: string
  className?: string
}

const COLORS = {
  green: 'var(--green-accent)',
  dark: 'var(--foreground)',
  muted: 'var(--neutral-300)',
}

export const ArcGauge = memo(function ArcGauge({
  value,
  segments,
  size = 240,
  strokeWidth = 18,
  headline,
  subhead,
  className = '',
}: ArcGaugeProps) {
  const padding = strokeWidth / 2 + 4
  const width = size
  const height = size / 2 + padding
  const cy = height - padding
  const radius = width / 2 - padding
  const arcLength = Math.PI * radius

  const normalized = useMemo(() => {
    const total = segments.reduce((s, seg) => s + seg.value, 0)
    const factor = total === 0 ? 0 : arcLength / total
    let offset = 0
    return segments.map((seg) => {
      const len = seg.value * factor
      const item = { ...seg, length: len, offset }
      offset += len
      return item
    })
  }, [segments, arcLength])

  return (
    <div className={`arc-gauge relative ${className}`} style={{ maxWidth: size }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${headline ?? value}% ${subhead ?? ''}`}
      >
        {/* Track */}
        <path
          className="arc-track"
          d={`M ${padding},${cy} A ${radius} ${radius} 0 0 1 ${width - padding},${cy}`}
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {normalized.map((seg, i) => (
          <path
            key={i}
            className="arc-segment"
            d={`M ${padding},${cy} A ${radius} ${radius} 0 0 1 ${width - padding},${cy}`}
            stroke={COLORS[seg.color]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.length} ${arcLength}`}
            strokeDashoffset={-seg.offset}
          />
        ))}
      </svg>

      <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="epoch-display" style={{ fontSize: '2.5rem' }}>
          {headline ?? `${value}%`}
        </div>
        {subhead && <div className="epoch-caption text-[var(--muted-foreground)]">{subhead}</div>}
      </div>

      {segments.some((s) => s.label) && (
        <div className="arc-labels">
          {segments
            .filter((s) => s.label)
            .map((s, i) => (
              <div key={i} className="arc-label">
                <div className="arc-label-value">{s.value}%</div>
                <div className="arc-label-caption">{s.label}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
})
