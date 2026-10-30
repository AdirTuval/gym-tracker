import { useLiveQuery } from 'dexie-react-hooks'
import { CARDIO_KINDS } from '../db/catalog'
import { db } from '../db/db'
import { topWeight, useWorkoutView, type TimelineItem } from '../db/queries'
import type { MuscleGroup } from '../db/types'
import { discardWorkout } from '../db/workout'
import { fmtWeight } from '../lib/format'
import { useNav, type ScreenProps } from '../nav/Navigator'
import { Confirm } from '../sheets/Confirm'
import { ExerciseForm } from '../sheets/ExerciseForm'
import { ExercisePicker } from '../sheets/ExercisePicker'
import { CARDIO_COLOR, CardioSheet, STRETCH_COLOR, StretchSheet } from '../sheets/Extras'
import { BodyFigure } from '../ui/BodyFigure'
import { Elapsed } from '../ui/Elapsed'
import { Icon, Ltr } from '../ui/Icon'
import { useSheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'

export interface WorkoutParams { workoutId: string }

export function Workout({ params }: ScreenProps) {
  const { workoutId } = params as WorkoutParams
  const nav = useNav()
  const sheet = useSheet()
  const toast = useToast()
  const view = useWorkoutView(workoutId)
  const counts = useLiveQuery(async () => {
    const all = await db.exercises.filter(e => !e.archived).toArray()
    return all.reduce<Record<string, number>>((a, e) => ({ ...a, [e.groupId]: (a[e.groupId] ?? 0) + 1 }), {})
  }, [])

  if (!view) return null // loading, or the workout was just discarded

  const { workout, groups, doneGroups, timeline } = view
  const next = groups.find(g => !doneGroups.has(g.id))
  const cardio = timeline.filter(t => t.type === 'cardio')
  const stretch = timeline.filter(t => t.type === 'stretch')

  const openExercise = (exerciseId: string, logId?: string) => nav.push('exercise', { workoutId, exerciseId, logId })

  function openPicker(group: MuscleGroup) {
    sheet.open(
      <ExercisePicker group={group} onClose={() => sheet.close()}
        onPick={id => sheet.close(() => openExercise(id))}
        onNew={() => sheet.open(
          <ExerciseForm groups={groups} groupId={group.id} onClose={() => sheet.close()}
            onSaved={id => sheet.close(() => openExercise(id))} />,
        )} />,
    )
  }

  function openCardio() {
    sheet.open(<CardioSheet workoutId={workoutId} onClose={() => sheet.close()} onDone={() => sheet.close(() => toast('אירובי נוסף לאימון'))} />)
  }
  function openStretch() {
    sheet.open(<StretchSheet workoutId={workoutId} onClose={() => sheet.close()} onDone={() => sheet.close(() => toast('גמישות נוספה לאימון'))} />)
  }

  function tapTimeline(item: TimelineItem) {
    if (item.type === 'exercise') return openExercise(item.log.exerciseId, item.log.id)
    const table = item.type === 'cardio' ? db.cardioLogs : db.stretchLogs
    sheet.open(
      <Confirm title="למחוק מהאימון?" actions={[
        { label: 'מחק', kind: 'danger', onClick: () => sheet.close(() => table.delete(item.log.id)) },
        { label: 'ביטול', kind: 'ghost', onClick: () => sheet.close() },
      ]} />,
    )
  }

  function endWorkout() {
    if (!timeline.length) {
      sheet.open(
        <Confirm title="לבטל את האימון?" text="עוד לא תועד שום תרגיל" actions={[
          { label: 'המשך להתאמן', kind: 'ghost', onClick: () => sheet.close() },
          { label: 'בטל אימון', kind: 'danger', onClick: () => sheet.close(async () => { nav.reset('home'); await discardWorkout(workoutId) }) },
        ]} />,
      )
      return
    }
    if (doneGroups.size < groups.length) {
      const missing = groups.filter(g => !doneGroups.has(g.id)).map(g => g.name).join(', ')
      sheet.open(
        <Confirm title="לסיים מוקדם?" text={`בוצעו ${doneGroups.size} מתוך ${groups.length} קבוצות. חסרים: ${missing}`} actions={[
          { label: 'סיים אימון', kind: 'primary', onClick: () => sheet.close(() => nav.push('summary', { workoutId })) },
          { label: 'המשך להתאמן', kind: 'ghost', onClick: () => sheet.close() },
        ]} />,
      )
      return
    }
    nav.push('summary', { workoutId })
  }

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={nav.pop} aria-label="למסך הבית"><Icon name="back" /></button>
        <div className="grow">
          <div className="live">אימון פעיל</div>
          <div className="timer"><Elapsed since={workout.startedAt} /></div>
        </div>
        <button className="end-btn" onClick={endWorkout}>סיום</button>
      </div>

      <div className="content">
        <div className="progress">
          {groups.map(g => <i key={g.id} style={doneGroups.has(g.id) ? { background: g.color } : undefined} />)}
        </div>
        <div className="progress-label">
          <span><b>{doneGroups.size}</b> מתוך {groups.length} קבוצות</span>
          <span>{view.setCount} סטים</span>
        </div>

        {next ? (
          <button className="suggest pressable" style={{ ['--c' as string]: next.color }} onClick={() => openPicker(next)}>
            <div className="sfig"><BodyFigure group={next.id} color={next.color} /></div>
            <div>
              <div className="t">{doneGroups.size === 0 ? 'מתחילים מהגדולים' : 'הבא בתור'}</div>
              <div className="n">{next.name} · <Ltr>{next.defaultSets}×{next.defaultReps}</Ltr></div>
            </div>
            <div className="go"><Icon name="chevL" size="sm" /></div>
          </button>
        ) : (
          <div className="suggest" style={{ ['--c' as string]: 'var(--accent)' }}>
            <div className="go" style={{ margin: 0 }}><Icon name="check" size="sm" /></div>
            <div><div className="n">כל הקבוצות בוצעו</div><div className="t">אפשר להוסיף אירובי או גמישות, או לסיים</div></div>
          </div>
        )}

        <div className="ggrid">
          {groups.map(g => {
            const done = doneGroups.get(g.id)
            return (
              <button key={g.id} className={`gcard ${done ? 'done' : ''}`} style={{ ['--c' as string]: g.color }} onClick={() => openPicker(g)}>
                {done && <span className="check"><Icon name="check" size="sm" /></span>}
                <span className="scheme"><Ltr>{g.defaultSets}×{g.defaultReps}</Ltr></span>
                <div className="gfig"><BodyFigure group={g.id} color={g.color} /></div>
                <div className="gname">{g.name}</div>
                {done ? (
                  <>
                    <div className="gmeta">{done.exercise?.name}</div>
                    <div className="gmeta" style={{ marginTop: 0 }}>{fmtWeight(topWeight(done.sets))} ק״ג · {done.sets.length} סטים</div>
                  </>
                ) : (
                  <div className="gmeta">{counts?.[g.id] ?? 0} תרגילים</div>
                )}
              </button>
            )
          })}
        </div>

        <div className="section-title">תוספות</div>
        <div className="extras">
          <button className={`xcard pressable ${cardio.length ? 'logged' : ''}`} style={{ ['--xc' as string]: CARDIO_COLOR }} onClick={openCardio}>
            <div className="xi" style={{ background: `color-mix(in srgb,${CARDIO_COLOR} 15%,transparent)`, color: CARDIO_COLOR }}><Icon name="pulse" /></div>
            <div>
              <div className="t">אירובי</div>
              <div className="s">{cardio.length ? cardio.map(c => c.type === 'cardio' && `${c.log.durationMin}׳ ${CARDIO_KINDS[c.log.kind]}`).join(', ') : 'הוסף'}</div>
            </div>
          </button>
          <button className={`xcard pressable ${stretch.length ? 'logged' : ''}`} style={{ ['--xc' as string]: STRETCH_COLOR }} onClick={openStretch}>
            <div className="xi" style={{ background: `color-mix(in srgb,${STRETCH_COLOR} 15%,transparent)`, color: STRETCH_COLOR }}><Icon name="stretch" /></div>
            <div>
              <div className="t">גמישות</div>
              <div className="s">{stretch.length ? stretch.map(s => s.type === 'stretch' && `${s.log.durationMin} דק׳`).join(', ') : 'הוסף'}</div>
            </div>
          </button>
        </div>

        <div className="section-title">יומן האימון <small>לחיצה לעריכה</small></div>
        <div className="card" style={{ padding: '6px 16px' }}>
          {timeline.length ? (
            <div className="log">{timeline.map(item => <TimelineRow key={item.log.id} item={item} groups={groups} onClick={() => tapTimeline(item)} />)}</div>
          ) : (
            <div className="empty-log" style={{ padding: '14px 0' }}>עוד לא תועד כלום. בחר קבוצת שרירים כדי להתחיל.</div>
          )}
        </div>
      </div>
    </>
  )
}

export function TimelineRow({ item, groups, onClick }: { item: TimelineItem; groups: MuscleGroup[]; onClick?: () => void }) {
  const time = new Date(item.at).toTimeString().slice(0, 5)
  let color: string, title: string, detail: React.ReactNode
  if (item.type === 'exercise') {
    color = groups.find(g => g.id === item.log.groupId)?.color ?? 'var(--muted)'
    title = item.exercise?.name ?? 'תרגיל'
    detail = item.sets.map((s, i) => (
      <span key={s.id}>{i > 0 && '  ·  '}<Ltr>{fmtWeight(s.weightKg)}×{s.reps}{s.result === 'failure' && <span className="fail-mark"> ✗</span>}</Ltr></span>
    ))
  } else if (item.type === 'cardio') {
    const c = item.log
    color = CARDIO_COLOR
    title = CARDIO_KINDS[c.kind]
    detail = [
      `${c.durationMin} דק׳`,
      c.incline != null && `שיפוע ${c.incline}`,
      c.speedKmh != null && `${c.speedKmh} קמ״ש`,
      c.level != null && `רמה ${c.level}`,
    ].filter(Boolean).join(' · ')
  } else {
    color = STRETCH_COLOR
    title = 'גמישות ומתיחות'
    detail = `${item.log.durationMin} דק׳`
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className="log-item" style={{ ['--c' as string]: color }} onClick={onClick}>
      <div className="bar" />
      <div><div className="t">{title}</div><div className="s">{detail}</div></div>
      <time>{time}</time>
    </Tag>
  )
}
