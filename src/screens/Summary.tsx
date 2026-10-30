import { useState } from 'react'
import { useWorkoutView } from '../db/queries'
import { finishWorkout } from '../db/workout'
import { useNav, type ScreenProps } from '../nav/Navigator'
import { Icon, Ltr } from '../ui/Icon'
import { useToast } from '../ui/Toast'
import { TimelineRow } from './Workout'

const FEELINGS: [1 | 2 | 3 | 4, string, string][] = [[1, '😮‍💨', 'קשה מאוד'], [2, '😤', 'קשה'], [3, '🙂', 'טוב'], [4, '🔥', 'מעולה']]
// A workout left open for hours (forgot to tap "סיום") ends at its last logged activity.
const STALE_MS = 3 * 60 * 60 * 1000
const hhmm = (t: number) => new Date(t).toTimeString().slice(0, 5)

export function Summary({ params }: ScreenProps) {
  const { workoutId } = params as { workoutId: string }
  const nav = useNav()
  const toast = useToast()
  const view = useWorkoutView(workoutId)
  const [openedAt] = useState(() => Date.now())
  const [feeling, setFeeling] = useState<1 | 2 | 3 | 4>()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  if (!view) return null
  const { workout, doneGroups, groups, timeline } = view
  const endedAt = openedAt - view.lastActivityAt > STALE_MS ? view.lastActivityAt : openedAt
  const minutes = Math.max(1, Math.round((endedAt - workout.startedAt) / 60000))

  async function save() {
    if (saving) return
    setSaving(true)
    await finishWorkout(workoutId, endedAt, feeling, notes)
    nav.reset('home')
    setTimeout(() => toast('האימון נשמר 💪'), 300)
  }

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={nav.pop} aria-label="חזרה לאימון"><Icon name="back" /></button>
      </div>
      <div className="content">
        <div className="sum-hero">
          <div className="badge-big"><Icon name="check" size="lg" /></div>
          <div className="h-xl">כל הכבוד!</div>
          <div className="eyebrow" style={{ marginTop: 6 }}><Ltr>{hhmm(workout.startedAt)}–{hhmm(endedAt)}</Ltr></div>
        </div>
        <div className="sum-grid">
          <div className="stat"><div className="l"><Icon name="clock" size="sm" /> משך</div><div className="v">{minutes}<small> דק׳</small></div></div>
          <div className="stat"><div className="l"><Icon name="layers" size="sm" /> נפח כולל</div><div className="v">{view.volume.toLocaleString()}<small> ק״ג</small></div></div>
          <div className="stat"><div className="l"><Icon name="repeat" size="sm" /> סטים</div><div className="v">{view.setCount}</div></div>
          <div className="stat"><div className="l"><Icon name="flame" size="sm" /> קבוצות</div><div className="v">{doneGroups.size}<small>/{groups.length}</small></div></div>
        </div>

        <div className="section-title">מה עשית</div>
        <div className="card sum-list">
          <div className="log">{timeline.map(item => <TimelineRow key={item.log.id} item={item} groups={groups} />)}</div>
        </div>

        <div className="section-title">איך הרגיש?</div>
        <div className="feel">
          {FEELINGS.map(([v, emoji, label]) => (
            <button key={v} className={feeling === v ? 'sel' : ''} onClick={() => setFeeling(f => (f === v ? undefined : v))}>
              <span>{emoji}</span>{label}
            </button>
          ))}
        </div>
        <textarea className="note" rows={2} placeholder="הערות לאימון (אופציונלי)" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="bottom-bar">
        <button className="btn btn-primary" onClick={save} disabled={saving}><Icon name="check" /> שמור אימון</button>
      </div>
    </>
  )
}
