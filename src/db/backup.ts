import { db } from './db'

// Backup = one JSON file with every table. Restore merges by id, so restoring
// the same file twice (or an older file) never duplicates anything.

const APP = 'gym-tracker'
const FORMAT = 1
const LAST_BACKUP_KEY = 'gym-tracker:lastBackupAt'

export interface Backup {
  app: typeof APP
  format: number
  exportedAt: number
  tables: Record<string, unknown[]>
}

export async function buildBackup(): Promise<Backup> {
  const entries = await Promise.all(db.tables.map(async t => [t.name, await t.toArray()] as const))
  return { app: APP, format: FORMAT, exportedAt: Date.now(), tables: Object.fromEntries(entries) }
}

export function backupFile(backup: Backup) {
  const d = new Date(backup.exportedAt)
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return new File([JSON.stringify(backup)], `gym-tracker-${stamp}.json`, { type: 'application/json' })
}

/**
 * Must be called synchronously from a tap: iOS only opens the share sheet during a user gesture,
 * so the file is prepared ahead of time.
 */
export async function shareBackup(file: File): Promise<boolean> {
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
    } else {
      const url = URL.createObjectURL(file)
      const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    }
    markBackedUp()
    return true
  } catch (e) {
    if ((e as Error).name === 'AbortError') return false // user closed the share sheet
    throw e
  }
}

export async function readBackup(file: File): Promise<Backup> {
  let data: Backup
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('הקובץ לא נקרא. צריך לבחור קובץ JSON שיוצא מהאפליקציה.')
  }
  if (data?.app !== APP || typeof data.tables !== 'object') throw new Error('זה לא קובץ גיבוי של Gym Tracker.')
  if (data.format > FORMAT) throw new Error('הגיבוי נוצר בגרסה חדשה יותר של האפליקציה. עדכן את האפליקציה ונסה שוב.')
  return data
}

export async function restoreBackup(backup: Backup) {
  const known = db.tables.filter(t => Array.isArray(backup.tables[t.name]))
  await db.transaction('rw', known, async () => {
    for (const t of known) await t.bulkPut(backup.tables[t.name])
  })
}

export function lastBackupAt(): number | undefined {
  try {
    const v = localStorage.getItem(LAST_BACKUP_KEY)
    return v ? Number(v) : undefined
  } catch {
    return undefined
  }
}

function markBackedUp() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
  } catch {
    /* storage unavailable: the reminder will just show again */
  }
}
