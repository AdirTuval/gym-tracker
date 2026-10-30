import type { GroupId } from '../db/types'

type Part = 'lats' | 'chest' | 'delts' | 'bi' | 'tri' | 'quads' | 'calves'
const HIGHLIGHT: Record<GroupId, Part[]> = {
  back: ['lats'], chest: ['chest'], legs: ['quads', 'calves'], shoulders: ['delts'], biceps: ['bi'], triceps: ['tri'],
}

/** Stylized front view of a body with one muscle group lit in its color. */
export function BodyFigure({ group, color }: { group?: GroupId; color?: string }) {
  const on = (p: Part) => (group && color && HIGHLIGHT[group].includes(p) ? { className: 'hl', fill: color } : { fill: 'var(--body)' })
  return (
    <svg className="fig" viewBox="0 0 64 110" style={{ ['--c' as string]: color }} aria-hidden="true">
      <circle cx="32" cy="10.5" r="7" fill="var(--body)" />
      <rect x="29" y="16.5" width="6" height="5" rx="2" fill="var(--body)" />
      <path d="M18 24 Q32 19.5 46 24 L44.5 44 Q43.5 55 40.5 58 L23.5 58 Q20.5 55 19.5 44 Z" fill="var(--body)" />
      <path d="M20.6 31.5 L28 37.5 L26.5 53 Q22 51 21 44 Z" {...on('lats')} />
      <path d="M43.4 31.5 L36 37.5 L37.5 53 Q42 51 43 44 Z" {...on('lats')} />
      <path d="M21 26.5 Q26 23.5 31 24.5 L31 34.5 Q25 36.5 21 33.5 Z" {...on('chest')} />
      <path d="M43 26.5 Q38 23.5 33 24.5 L33 34.5 Q39 36.5 43 33.5 Z" {...on('chest')} />
      <rect x="27" y="38" width="10" height="17" rx="3" fill="var(--body-2)" />
      <circle cx="16" cy="26.5" r="5.5" {...on('delts')} />
      <circle cx="48" cy="26.5" r="5.5" {...on('delts')} />
      <rect x="12.2" y="31.5" width="4.3" height="15" rx="2.1" {...on('bi')} />
      <rect x="7.6" y="31.5" width="4.3" height="15" rx="2.1" {...on('tri')} />
      <rect x="47.5" y="31.5" width="4.3" height="15" rx="2.1" {...on('bi')} />
      <rect x="52.1" y="31.5" width="4.3" height="15" rx="2.1" {...on('tri')} />
      <rect x="8.2" y="47.8" width="7.6" height="14" rx="3.2" fill="var(--body)" />
      <rect x="48.2" y="47.8" width="7.6" height="14" rx="3.2" fill="var(--body)" />
      <path d="M23.5 58.5 L40.5 58.5 L42 64 L22 64 Z" fill="var(--body)" />
      <rect x="21.5" y="63" width="9.5" height="23" rx="4.5" {...on('quads')} />
      <rect x="33" y="63" width="9.5" height="23" rx="4.5" {...on('quads')} />
      <rect x="22.5" y="87.5" width="7.5" height="19" rx="3.5" {...on('calves')} />
      <rect x="34" y="87.5" width="7.5" height="19" rx="3.5" {...on('calves')} />
    </svg>
  )
}
