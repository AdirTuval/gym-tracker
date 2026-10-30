import { useId } from 'react'
import { fmtWeight } from '../lib/format'

/** Line chart of one value per session, oldest → newest (left → right). */
export function LineChart({ values, labels, color, unit }: { values: number[]; labels: string[]; color: string; unit?: string }) {
  const gid = useId()
  const W = 320, H = 150, pl = 8, pr = 30, pt = 22, pb = 24
  const min = Math.min(...values), max = Math.max(...values)
  const pad = (max - min) * 0.25 || max * 0.1 || 1
  const lo = min - pad, hi = max + pad
  const x = (i: number) => pl + (i * (W - pl - pr)) / Math.max(1, values.length - 1)
  const y = (v: number) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb)
  const pts = values.map((v, i) => [x(i), y(v)] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${x(values.length - 1)} ${H - pb} L${x(0)} ${H - pb} Z`
  const last = pts[pts.length - 1]
  // show at most ~6 date labels, always including the newest
  const every = Math.ceil(labels.length / 6)
  const label = `${fmtWeight(values[values.length - 1])}${unit ? ' ' + unit : ''}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`גרף: ${label}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(t => {
        const gy = pt + t * (H - pt - pb)
        return (
          <g key={t}>
            <line x1={pl} x2={W - pr + 6} y1={gy} y2={gy} stroke="rgba(255,255,255,.06)" />
            <text x={W - 2} y={gy + 4} textAnchor="end" fontSize="10" fill="#5A606C">{Math.round(hi - t * (hi - lo))}</text>
          </g>
        )
      })}
      <path d={area} fill={`url(#${CSS.escape(gid)})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.slice(0, -1).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#14161B" stroke={color} strokeWidth="2" />)}
      <circle cx={last[0]} cy={last[1]} r="9" fill={color} opacity=".2" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill={color} />
      <g transform={`translate(${Math.min(last[0], W - pr - 26)}, ${last[1] - 14})`}>
        <rect x="-30" y="-15" width="56" height="20" rx="7" fill={color} />
        <text x="-2" y="-1" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#0A0B0E">{label}</text>
      </g>
      {labels.map((l, i) =>
        (labels.length - 1 - i) % every === 0 ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : 'middle'} fontSize="10" fill="#5A606C">{l}</text>
        ) : null,
      )}
    </svg>
  )
}
