import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { db, newId } from '../db/db'
import { exerciseHistory, topWeight, volumeOf } from '../db/queries'
import type { SetResult } from '../db/types'
import { deleteExerciseLog, finishExerciseLog, syncExerciseLog, type DraftSet } from '../db/workout'
import { daysAgo, fmtWeight } from '../lib/format'
import { useNav, type ScreenProps } from '../nav/Navigator'
import { Confirm } from '../sheets/Confirm'
import { LineChart } from '../ui/Chart'
import { Elapsed } from '../ui/Elapsed'
import { Icon, Ltr } from '../ui/Icon'
import { useSheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'

export interface ExerciseParams { workoutId: string; exerciseId: string; logId?: string }

const dayMonth = (t: number) => { const d = new Date(t); return `${d.getDate()}.${d.getMonth() + 1}` }

export function Exercise({ params }: ScreenProps) {
  const { workoutId, exerciseId, logId: existingLogId } = params as ExerciseParams
  const nav = useNav()
  const sheet = useSheet()
  const toast = useToast()

  const data = useLiveQuery(async () => {
    const exercise = await db.exercises.get(exerciseId)
    const group = exercise && (await db.groups.get(exercise.groupId))
    const workout = await db.workouts.get(workoutId)
    return { exercise, group, workout, history: await exerciseHistory(exerciseId, workoutId) }
  }, [exerciseId, workoutId])

  const [logId] = useState(() => existingLogId ?? newId())
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [sets, setSets] = useState<DraftSet[] | null>(null)
  const [notes, setNotes] = useState('')
  const [chartTab, setChartTab] = useState<'w' | 'v'>('w')
  const contentRef = useRef<HTMLDivElement>(null)

  // Build the draft once: from the saved log when editing, otherwise prefilled from last time.
  useEffect(() => {
    if (sets || !data?.group) return
    const { group, history } = data
    let cancelled = false
    ;(async () => {
      if (existingLogId) {
        const [log, saved] = await Promise.all([db.exerciseLogs.get(existingLogId), db.setLogs.where('exerciseLogId').equals(existingLogId).sortBy('index')])
        if (cancelled) return
        if (log) { setStartedAt(log.startedAt); setNotes(log.notes ?? '') }
        setSets(saved.map(s => ({ id: s.id, weightKg: s.weightKg, reps: s.reps, result: s.result, completedAt: s.completedAt })))
        return
      }
      const last = history.at(-1)?.sets ?? []
      setSets(Array.from({ length: group.defaultSets }, (_, i) => ({
        id: newId(),
        weightKg: last[i]?.weightKg ?? last.at(-1)?.weightKg ?? 0,
        reps: group.defaultReps,
        result: null,
      })))
    })()
    return () => { cancelled = true }
  }, [data, sets, existingLogId])

  if (!data?.exercise || !data.group || !sets) return null
  const { exercise: ex, group: g, history } = data

  const meta = { id: logId, workoutId, exerciseId, groupId: ex.groupId, startedAt }
  const commit = (next: DraftSet[]) => {
    setSets(next)
    syncExerciseLog(meta, next).catch(() => toast('השמירה נכשלה. נסה שוב'))
  }
  const update = (i: number, patch: Partial<DraftSet>) => commit(sets.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  /** Changing a value also carries it to the later, not-yet-logged sets that had the same value. */
  const setValue = (i: number, key: 'weightKg' | 'reps', value: number) => {
    const old = sets[i][key]
    commit(sets.map((s, j) => (j === i || (j > i && !s.result && s[key] === old) ? { ...s, [key]: value } : s)))
  }
  const step = (i: number, key: 'weightKg' | 'reps', dir: 1 | -1) => {
    const delta = key === 'weightKg' ? ex.weightStep : 1
    setValue(i, key, Math.max(0, Math.round((sets[i][key] + dir * delta) * 100) / 100))
  }
  const typed = (i: number, key: 'weightKg' | 'reps', raw: string) => {
    const n = parseFloat(raw.replace(',', '.'))
    if (!isNaN(n) && n !== sets[i][key]) setValue(i, key, Math.max(0, n))
  }
  const setResult = (i: number, r: SetResult) => {
    const s = sets[i]
    update(i, s.result === r ? { result: null, completedAt: undefined } : { result: r, completedAt: s.completedAt ?? Date.now() })
  }
  const addSet = () => {
    const l = sets.at(-1)
    commit([...sets, { id: newId(), weightKg: l?.weightKg ?? 0, reps: l?.reps ?? g.defaultReps, result: null }])
    requestAnimationFrame(() => contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' }))
  }
  const removeSet = (i: number) => commit(sets.filter((_, j) => j !== i))

  const loggedCount = sets.filter(s => s.result).length
  const last = history.at(-1)
  const lastTop = last ? topWeight(last.sets) : 0
  const allOk = !!last && last.sets.length >= g.defaultSets && last.sets.every(s => s.result === 'success' && s.reps >= g.defaultReps)
  const nextWeight = lastTop + ex.weightStep
  const applyWeight = (w: number) => {
    commit(sets.map(s => (s.result ? s : { ...s, weightKg: w })))
    toast(`המשקל עודכן ל-${fmtWeight(w)} ק״ג`)
  }

  async function finish() {
    if (!loggedCount) return toast('סמן הצלחה או Failure לפחות לסט אחד')
    await finishExerciseLog(logId, notes)
    nav.pop()
    setTimeout(() => toast(`${g!.name} ✓ ${ex!.name}`), 250)
  }
  async function back() {
    if (loggedCount) await finishExerciseLog(logId, notes)
    nav.pop()
  }
  function remove() {
    sheet.open(
      <Confirm title="למחוק את התרגיל מהאימון?" text="כל הסטים שתועדו בו יימחקו" actions={[
        { label: 'מחק תרגיל', kind: 'danger', onClick: () => sheet.close(async () => { await deleteExerciseLog(logId); nav.pop() }) },
        { label: 'ביטול', kind: 'ghost', onClick: () => sheet.close() },
      ]} />,
    )
  }

  const chartValues = history.map(h => (chartTab === 'w' ? topWeight(h.sets) : volumeOf(h.sets)))
  const delta = chartValues.length > 1 && chartValues[0] ? Math.round(((chartValues.at(-1)! - chartValues[0]) / chartValues[0]) * 100) : 0
  const wLabel = (w: number) => (ex.isBodyweight && !w ? 'BW' : fmtWeight(w))

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={back} aria-label="חזרה לאימון"><Icon name="back" /></button>
        <div className="grow" />
        {data.workout && <div className="chip"><Icon name="clock" size="sm" /><Elapsed since={data.workout.startedAt} /></div>}
        {(loggedCount > 0 || existingLogId) && <button className="icon-btn" onClick={remove} aria-label="מחק תרגיל"><Icon name="trash" /></button>}
      </div>

      <div className="content ex-top" ref={contentRef} style={{ ['--c' as string]: g.color }}>
        <div className="gtag">{g.name}</div>
        <div className="ex-title">{ex.name}</div>
        <div className="target">
          <span className="chip"><Icon name="repeat" size="sm" /> יעד <Ltr>{g.defaultSets}×{g.defaultReps}</Ltr></span>
          <span className="chip">{ex.equipment}</span>
        </div>

        {last ? (
          <section className="card last">
            <div className="last-head"><b>פעם שעברה</b><span>{daysAgo(last.log.startedAt)} · {dayMonth(last.log.startedAt)}</span></div>
            <div className="last-sets">
              {last.sets.map(s => (
                <div key={s.id} className="lset">
                  <span className={`st ${s.result === 'success' ? 'ok' : 'fail'}`}><Icon name={s.result === 'success' ? 'check' : 'x'} size="sm" /></span>
                  <div className="w">{wLabel(s.weightKg)}</div>
                  <div className="r">{ex.isBodyweight && !s.weightKg ? '' : 'ק״ג · '}{s.reps} חזרות</div>
                </div>
              ))}
            </div>
            {!existingLogId && (allOk ? (
              <div className="tip up">
                <Icon name="trend" size="sm" />
                <span>כל הסטים הצליחו. זמן לעלות ל-<b>{fmtWeight(nextWeight)} ק״ג</b></span>
                <button className="apply" onClick={() => applyWeight(nextWeight)}>החל</button>
              </div>
            ) : (
              <div className="tip hold"><Icon name="flame" size="sm" /><span>בפעם שעברה לא כל הסטים הצליחו. כדאי להישאר על {fmtWeight(lastTop)} ק״ג</span></div>
            ))}
          </section>
        ) : (
          <section className="card last">
            <div className="last-head"><b>פעם ראשונה בתרגיל הזה</b></div>
            <div className="tip up" style={{ marginTop: 10 }}><Icon name="trend" size="sm" /><span>בחר משקל התחלתי. מהפעם הבאה יופיעו כאן הנתונים מהאימון הקודם.</span></div>
          </section>
        )}

        {history.length > 0 && (
          <div className="stats">
            <div className="stat"><div className="l"><Icon name="trophy" size="sm" /> שיא</div><div className="v">{wLabel(Math.max(...history.map(h => topWeight(h.sets))))}<small> ק״ג</small></div></div>
            <div className="stat"><div className="l"><Icon name="layers" size="sm" /> נפח אחרון</div><div className="v">{volumeOf(last!.sets).toLocaleString()}</div></div>
            <div className="stat"><div className="l"><Icon name="cal" size="sm" /> ביצועים</div><div className="v">{history.length}</div></div>
          </div>
        )}

        {history.length >= 2 && (
          <section className="card chart-card">
            <div className="chart-head">
              <div className="tabs">
                <button className={chartTab === 'w' ? 'sel' : ''} onClick={() => setChartTab('w')}>משקל</button>
                <button className={chartTab === 'v' ? 'sel' : ''} onClick={() => setChartTab('v')}>נפח</button>
              </div>
              <div className="delta" style={delta < 0 ? { color: 'var(--fail)' } : undefined}>
                <Icon name="trend" size="sm" /> <Ltr>{delta >= 0 ? '+' : ''}{delta}%</Ltr> ב-{history.length} אימונים
              </div>
            </div>
            <div className="chart">
              <LineChart values={chartValues} labels={history.map(h => dayMonth(h.log.startedAt))} color={g.color} unit={chartTab === 'w' ? 'kg' : ''} />
            </div>
          </section>
        )}

        <div className="section-title">הסטים של היום <small>{loggedCount}/{sets.length} תועדו</small></div>
        <div className="sets">
          {sets.map((s, i) => {
            const prev = last?.sets[i]
            return (
              <div key={s.id} className={`set ${s.result ?? ''}`}>
                <div className="set-top">
                  <span className="set-idx">{s.result === 'success' ? <Icon name="check" size="sm" /> : s.result === 'failure' ? <Icon name="x" size="sm" /> : i + 1}</span>
                  <span>סט {i + 1}</span>
                  <span className="prev">{prev ? <>קודם: <Ltr>{fmtWeight(prev.weightKg)} × {prev.reps}</Ltr></> : i >= g.defaultSets ? 'סט נוסף' : ''}</span>
                  {sets.length > 1 && i >= g.defaultSets && <button className="rm" onClick={() => removeSet(i)} aria-label="הסר סט"><Icon name="trash" size="sm" /></button>}
                </div>
                <div className="set-mid">
                  <div className="stepper">
                    <button onClick={() => step(i, 'weightKg', 1)} aria-label="הוסף משקל"><Icon name="plus" size="sm" /></button>
                    <div className="sv">
                      <input key={s.weightKg} inputMode="decimal" defaultValue={fmtWeight(s.weightKg)} aria-label={`משקל סט ${i + 1}`}
                        onFocus={e => e.target.select()} onBlur={e => typed(i, 'weightKg', e.target.value)} />
                      <span className="u">{ex.isBodyweight ? 'ק״ג תוספת' : 'ק״ג'}</span>
                    </div>
                    <button onClick={() => step(i, 'weightKg', -1)} aria-label="הפחת משקל"><Icon name="minus" size="sm" /></button>
                  </div>
                  <div className="stepper">
                    <button onClick={() => step(i, 'reps', 1)} aria-label="הוסף חזרה"><Icon name="plus" size="sm" /></button>
                    <div className="sv">
                      <input key={s.reps} inputMode="numeric" defaultValue={s.reps} aria-label={`חזרות סט ${i + 1}`}
                        onFocus={e => e.target.select()} onBlur={e => typed(i, 'reps', e.target.value)} />
                      <span className="u">חזרות</span>
                    </div>
                    <button onClick={() => step(i, 'reps', -1)} aria-label="הפחת חזרה"><Icon name="minus" size="sm" /></button>
                  </div>
                </div>
                <div className="result">
                  <button className={`ok ${s.result === 'success' ? 'sel' : ''}`} onClick={() => setResult(i, 'success')}><Icon name="check" size="sm" /> הצלחה</button>
                  <button className={`fail ${s.result === 'failure' ? 'sel' : ''}`} onClick={() => setResult(i, 'failure')}><Icon name="x" size="sm" /> Failure</button>
                </div>
              </div>
            )
          })}
        </div>
        <button className="add-row add-set" onClick={addSet}><Icon name="plus" size="sm" /> הוסף סט</button>
        <textarea className="note" rows={1} placeholder="הערה לתרגיל (אופציונלי)" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="bottom-bar">
        <button className={`btn ${loggedCount ? 'btn-primary' : 'btn-ghost'}`} onClick={finish}>
          {loggedCount ? <><Icon name="check" /> סיים תרגיל</> : 'סמן לפחות סט אחד'}
        </button>
      </div>
    </>
  )
}
