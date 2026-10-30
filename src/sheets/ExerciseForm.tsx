import { useState } from 'react'
import type { Exercise, GroupId, MuscleGroup } from '../db/types'
import { saveExercise, setExerciseArchived } from '../db/workout'
import { Icon } from '../ui/Icon'

const EQUIPMENT = ['דאמבלים', 'משקולות חופשיות', 'מוט', 'מכונה', 'כבל', 'משקל גוף']
const STEPS = [1, 2, 2.5, 5]

/** Create or edit an exercise. Exercises with history are hidden (archived), never deleted. */
export function ExerciseForm({ groups, groupId, exercise, onSaved, onClose }: {
  groups: MuscleGroup[]
  groupId: GroupId
  exercise?: Exercise
  onSaved: (id: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(exercise?.name ?? '')
  const [group, setGroup] = useState<GroupId>(exercise?.groupId ?? groupId)
  const [equipment, setEquipment] = useState(exercise?.equipment ?? 'דאמבלים')
  const [step, setStep] = useState(exercise?.weightStep ?? 2)
  const [bodyweight, setBodyweight] = useState(exercise?.isBodyweight ?? false)
  const [saving, setSaving] = useState(false)
  const valid = name.trim().length > 0

  async function save() {
    if (!valid || saving) return
    setSaving(true)
    const id = await saveExercise({ id: exercise?.id, name: name.trim(), groupId: group, equipment, weightStep: step, isBodyweight: bodyweight })
    onSaved(id)
  }

  async function toggleArchived() {
    if (!exercise) return
    await setExerciseArchived(exercise.id, !exercise.archived)
    onClose()
  }

  return (
    <>
      <div className="sheet-head">
        <div className="grow"><div className="h-lg">{exercise ? 'עריכת תרגיל' : 'תרגיל חדש'}</div></div>
        <button className="icon-btn" onClick={onClose} aria-label="סגור"><Icon name="x" /></button>
      </div>
      <div className="sheet-body">
        <label className="field-label" htmlFor="ex-name">שם התרגיל</label>
        <input id="ex-name" className="text-input" value={name} onChange={e => setName(e.target.value)} placeholder="למשל: חתירה בכבל בישיבה" autoComplete="off" />

        <div className="field-label">קבוצת שרירים</div>
        <div className="seg-chips">
          {groups.map(g => (
            <button key={g.id} className={`seg-chip ${group === g.id ? 'sel' : ''}`} style={{ ['--xc' as string]: g.color }} onClick={() => setGroup(g.id)}>{g.name}</button>
          ))}
        </div>

        <div className="field-label">ציוד</div>
        <div className="seg-chips">
          {EQUIPMENT.map(e => (
            <button key={e} className={`seg-chip ${equipment === e ? 'sel' : ''}`} onClick={() => setEquipment(e)}>{e}</button>
          ))}
        </div>

        <div className="field-label">קפיצת משקל בכל לחיצה על +/−</div>
        <div className="seg-chips">
          {STEPS.map(s => (
            <button key={s} className={`seg-chip ${step === s ? 'sel' : ''}`} onClick={() => setStep(s)}>{s} ק״ג</button>
          ))}
        </div>

        <button className="toggle-row" onClick={() => setBodyweight(b => !b)} role="switch" aria-checked={bodyweight}>
          <div>
            <div className="t">תרגיל משקל גוף</div>
            <div className="s">המשקל שנרשם הוא תוספת (למשל חגורת משקולות במתח)</div>
          </div>
          <span className={`switch ${bodyweight ? 'on' : ''}`} />
        </button>
      </div>
      <div className="sheet-foot col">
        <button className="btn btn-primary" disabled={!valid || saving} onClick={save}>
          <Icon name="check" /> {exercise ? 'שמור שינויים' : 'הוסף תרגיל'}
        </button>
        {exercise && (
          <button className="btn btn-ghost" onClick={toggleArchived}>
            <Icon name="eyeOff" /> {exercise.archived ? 'החזר לרשימה' : 'הסתר מהרשימה'}
          </button>
        )}
      </div>
    </>
  )
}
