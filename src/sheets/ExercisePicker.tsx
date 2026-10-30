import { useGroupExercises } from '../db/queries'
import type { MuscleGroup } from '../db/types'
import { daysAgo, fmtWeight } from '../lib/format'
import { BodyFigure } from '../ui/BodyFigure'
import { Icon } from '../ui/Icon'

export function ExercisePicker({ group, onPick, onNew, onClose }: {
  group: MuscleGroup
  onPick: (exerciseId: string) => void
  onNew: () => void
  onClose: () => void
}) {
  const rows = useGroupExercises(group.id)
  const newestId = rows?.find(r => r.last)?.exercise.id

  return (
    <>
      <div className="sheet-head">
        <div className="sfig"><BodyFigure group={group.id} color={group.color} /></div>
        <div className="grow">
          <div className="h-lg">{group.name}</div>
          <div className="eyebrow">{group.defaultSets} סטים × {group.defaultReps} חזרות · בחר תרגיל</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="סגור"><Icon name="x" /></button>
      </div>
      <div className="sheet-body" style={{ ['--c' as string]: group.color }}>
        {rows?.map(({ exercise: e, last }) => {
          const first = last?.sets[0]
          return (
            <button key={e.id} className="ex-row pressable" onClick={() => onPick(e.id)}>
              <div className="grow">
                <div className="t">{e.name}</div>
                <div className="s">
                  {e.id === newestId && <span className="tag">אחרון</span>}
                  <span>{e.equipment}</span>
                  {first ? (
                    <>
                      <span>·</span>
                      <span>{e.isBodyweight && !first.weightKg ? 'משקל גוף' : `${fmtWeight(first.weightKg)} ק״ג`} · {first.reps} חזרות</span>
                      <span>·</span>
                      <span>{daysAgo(last!.log.startedAt)}</span>
                    </>
                  ) : (
                    <><span>·</span><span>עוד לא בוצע</span></>
                  )}
                </div>
              </div>
              <span className="chev"><Icon name="chevL" /></span>
            </button>
          )
        })}
        <button className="add-row" onClick={onNew}><Icon name="plus" size="sm" /> תרגיל חדש</button>
      </div>
    </>
  )
}
