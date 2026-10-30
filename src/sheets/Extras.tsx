import { useState } from 'react'
import { CARDIO_KINDS } from '../db/catalog'
import type { CardioKind } from '../db/types'
import { addCardio, addStretch } from '../db/workout'
import { fmtWeight } from '../lib/format'
import { Icon } from '../ui/Icon'

type Field = 'durationMin' | 'incline' | 'speedKmh' | 'level'
const FIELD: Record<Field, { label: string; unit: string; step: number }> = {
  durationMin: { label: 'דקות', unit: 'דק׳', step: 1 },
  incline: { label: 'שיפוע', unit: '', step: 1 },
  speedKmh: { label: 'מהירות', unit: 'קמ״ש', step: 0.5 },
  level: { label: 'רמה', unit: '', step: 1 },
}
const DEFAULTS: Record<CardioKind, Partial<Record<Field, number>>> = {
  incline_walk: { durationMin: 15, incline: 15, speedKmh: 5.5 },
  run: { durationMin: 20, speedKmh: 9 },
  bike: { durationMin: 15, level: 8 },
  elliptical: { durationMin: 15, level: 6 },
  rower: { durationMin: 10 },
}
const CARDIO_COLOR = '#FF8A3D'
const STRETCH_COLOR = '#4FD1FF'

function ValueStepper({ label, unit, value, step, onChange, big }: {
  label?: string; unit: string; value: number; step: number; onChange: (v: number) => void; big?: boolean
}) {
  const set = (v: number) => onChange(Math.max(0, Math.round(v * 10) / 10))
  return (
    <div className="vstep" style={big ? { padding: 18 } : undefined}>
      {label && <div className="lbl">{label}</div>}
      <div className="val" style={big ? { fontSize: 44 } : undefined}>{fmtWeight(value)}{unit && <small>{unit}</small>}</div>
      <div className="row">
        <button className={`mini-btn ${big ? 'big' : ''}`} onClick={() => set(value - step)} aria-label={`הפחת ${label ?? ''}`}><Icon name="minus" size="sm" /></button>
        <button className={`mini-btn ${big ? 'big' : ''}`} onClick={() => set(value + step)} aria-label={`הוסף ${label ?? ''}`}><Icon name="plus" size="sm" /></button>
      </div>
    </div>
  )
}

export function CardioSheet({ workoutId, onDone, onClose }: { workoutId: string; onDone: () => void; onClose: () => void }) {
  const [kind, setKind] = useState<CardioKind>('incline_walk')
  const [values, setValues] = useState(DEFAULTS.incline_walk)
  const fields = Object.keys(DEFAULTS[kind]) as Field[]

  async function save() {
    await addCardio(workoutId, {
      kind,
      durationMin: values.durationMin ?? 0,
      incline: values.incline,
      speedKmh: values.speedKmh,
      level: values.level,
    })
    onDone()
  }

  return (
    <>
      <div className="sheet-head">
        <div className="nav-ic" style={{ color: CARDIO_COLOR }}><Icon name="pulse" /></div>
        <div className="grow"><div className="h-lg">אירובי</div><div className="eyebrow">בחר סוג ומלא פרטים</div></div>
        <button className="icon-btn" onClick={onClose} aria-label="סגור"><Icon name="x" /></button>
      </div>
      <div className="sheet-body" style={{ ['--xc' as string]: CARDIO_COLOR }}>
        <div className="seg-chips">
          {(Object.keys(CARDIO_KINDS) as CardioKind[]).map(k => (
            <button key={k} className={`seg-chip ${k === kind ? 'sel' : ''}`} onClick={() => { setKind(k); setValues(DEFAULTS[k]) }}>
              {CARDIO_KINDS[k]}
            </button>
          ))}
        </div>
        <div className="field-label">פרטים</div>
        <div className={`fields c${fields.length}`}>
          {fields.map(f => (
            <ValueStepper key={f} label={FIELD[f].label} unit={FIELD[f].unit} step={FIELD[f].step} value={values[f] ?? 0}
              onChange={v => setValues(s => ({ ...s, [f]: v }))} />
          ))}
        </div>
      </div>
      <div className="sheet-foot"><button className="btn btn-primary" onClick={save}><Icon name="plus" /> הוסף לאימון</button></div>
    </>
  )
}

export function StretchSheet({ workoutId, onDone, onClose }: { workoutId: string; onDone: () => void; onClose: () => void }) {
  const [minutes, setMinutes] = useState(8)
  return (
    <>
      <div className="sheet-head">
        <div className="nav-ic" style={{ color: STRETCH_COLOR }}><Icon name="stretch" /></div>
        <div className="grow"><div className="h-lg">גמישות ומתיחות</div><div className="eyebrow">כמה זמן?</div></div>
        <button className="icon-btn" onClick={onClose} aria-label="סגור"><Icon name="x" /></button>
      </div>
      <div className="sheet-body">
        <ValueStepper big unit="דק׳" step={1} value={minutes} onChange={v => setMinutes(Math.max(1, v))} />
      </div>
      <div className="sheet-foot">
        <button className="btn btn-primary" onClick={async () => { await addStretch(workoutId, minutes); onDone() }}><Icon name="plus" /> הוסף לאימון</button>
      </div>
    </>
  )
}

export { CARDIO_COLOR, STRETCH_COLOR }
