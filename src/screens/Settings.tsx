import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { backupFile, buildBackup, lastBackupAt, readBackup, restoreBackup, shareBackup } from '../db/backup'
import { db } from '../db/db'
import { exerciseRank } from '../db/queries'
import type { Exercise, GroupId, MuscleGroup } from '../db/types'
import { daysAgo } from '../lib/format'
import { useNav } from '../nav/Navigator'
import { Confirm } from '../sheets/Confirm'
import { ExerciseForm } from '../sheets/ExerciseForm'
import { Icon } from '../ui/Icon'
import { useSheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'

export function Settings() {
  const nav = useNav()
  const sheet = useSheet()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackup] = useState(lastBackupAt)

  const catalog = useLiveQuery(async () => ({
    groups: await db.groups.orderBy('order').toArray(),
    exercises: await db.exercises.toArray(),
    workouts: await db.workouts.filter(w => !!w.endedAt).count(),
  }), [])
  // Prepared ahead of the tap: iOS only opens the share sheet synchronously from a gesture.
  const backup = useLiveQuery(buildBackup, [])
  const file = useMemo(() => backup && backupFile(backup), [backup])

  if (!catalog) return null
  const { groups, exercises, workouts } = catalog

  function editExercise(groupId: GroupId, exercise?: Exercise) {
    sheet.open(
      <ExerciseForm groups={groups} groupId={groupId} exercise={exercise} onClose={() => sheet.close()}
        onSaved={() => sheet.close(() => toast(exercise ? 'התרגיל עודכן' : 'התרגיל נוסף'))} />,
    )
  }

  async function exportNow() {
    if (!file) return
    try {
      if (await shareBackup(file)) {
        setLastBackup(lastBackupAt())
        toast('הגיבוי נוצר')
      }
    } catch {
      toast('הגיבוי נכשל. נסה שוב')
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const data = await readBackup(f)
      const count = (t: string) => data.tables[t]?.length ?? 0
      sheet.open(
        <Confirm
          title="לשחזר מהגיבוי?"
          text={`בקובץ: ${count('workouts')} אימונים, ${count('setLogs')} סטים. נתונים קיימים לא יימחקו: הגיבוי ימוזג איתם.`}
          actions={[
            { label: 'שחזר', kind: 'primary', onClick: () => sheet.close(async () => { await restoreBackup(data); toast('השחזור הושלם') }) },
            { label: 'ביטול', kind: 'ghost', onClick: () => sheet.close() },
          ]}
        />,
      )
    } catch (err) {
      toast((err as Error).message)
    }
  }

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={nav.pop} aria-label="חזרה"><Icon name="back" /></button>
        <div className="grow h-lg">הגדרות</div>
      </div>
      <div className="content">
        <div className="section-title" style={{ marginTop: 6 }}>גיבוי <small>{workouts} אימונים במכשיר</small></div>
        <section className="card backup-card">
          <div className="backup-head">
            <div className="nav-ic"><Icon name="shield" /></div>
            <div>
              <div className="t">{lastBackup ? `גיבוי אחרון ${daysAgo(lastBackup)}` : 'עוד לא גיבית'}</div>
              <div className="s">הנתונים נשמרים רק בטלפון. שמור את קובץ הגיבוי ב-iCloud Drive.</div>
            </div>
          </div>
          <div className="backup-actions">
            <button className="btn btn-primary sm" onClick={exportNow} disabled={!file}><Icon name="share" /> ייצא גיבוי</button>
            <button className="btn btn-ghost sm" onClick={() => fileInput.current?.click()}><Icon name="download" /> שחזר</button>
          </div>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onPickFile} />
        </section>

        <div className="section-title">תרגילים <small>לחיצה לעריכה</small></div>
        <div className="manage">
          {groups.map(g => <GroupSection key={g.id} group={g} exercises={exercises.filter(e => e.groupId === g.id)} onEdit={editExercise} />)}
        </div>
      </div>
    </>
  )
}

function GroupSection({ group, exercises, onEdit }: { group: MuscleGroup; exercises: Exercise[]; onEdit: (g: GroupId, e?: Exercise) => void }) {
  const sorted = [...exercises].sort((a, b) => Number(a.archived) - Number(b.archived) || exerciseRank(a) - exerciseRank(b))
  return (
    <section className="card manage-group" style={{ ['--c' as string]: group.color }}>
      <div className="manage-head">
        <span className="gdot" />
        <b>{group.name}</b>
        <button className="manage-add" onClick={() => onEdit(group.id)}><Icon name="plus" size="sm" /> הוסף</button>
      </div>
      {sorted.map(e => (
        <button key={e.id} className={`manage-row ${e.archived ? 'archived' : ''}`} onClick={() => onEdit(group.id, e)}>
          <span className="grow">{e.name}</span>
          {e.archived ? <span className="chip">מוסתר</span> : <span className="muted">{e.equipment}</span>}
          <Icon name="edit" size="sm" />
        </button>
      ))}
    </section>
  )
}
