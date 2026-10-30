import { db, newId } from './db'
import type { CardioLog, Exercise, ExerciseLog, SetResult } from './types'

// Writes for an in-progress workout. Every logged set is saved immediately,
// so nothing is lost if iOS kills the app in the background.

export async function getActiveWorkout() {
  return db.workouts.orderBy('startedAt').reverse().filter(w => !w.endedAt).first()
}

/** Resumes the open workout if there is one, otherwise starts a new one. */
export async function startWorkout(): Promise<string> {
  const active = await getActiveWorkout()
  if (active) return active.id
  const id = newId()
  await db.workouts.add({ id, startedAt: Date.now() })
  return id
}

export interface DraftSet {
  id: string
  weightKg: number
  reps: number
  result: SetResult | null
  completedAt?: number
}

type LogMeta = Pick<ExerciseLog, 'id' | 'workoutId' | 'exerciseId' | 'groupId' | 'startedAt'>

/**
 * Mirrors the exercise screen's sets into the database. Only sets with a result are stored.
 * The exercise log is created on the first logged set and removed if none are left.
 */
export async function syncExerciseLog(meta: LogMeta, sets: DraftSet[]) {
  const logged = sets.filter(s => s.result)
  await db.transaction('rw', db.exerciseLogs, db.setLogs, async () => {
    const existing = await db.exerciseLogs.get(meta.id)
    if (!logged.length) {
      if (existing) await removeExerciseLogInTx(meta.id)
      return
    }
    if (!existing) {
      const order = (await db.exerciseLogs.where('workoutId').equals(meta.workoutId).count()) + 1
      await db.exerciseLogs.add({ ...meta, order })
    }
    const keep = new Set(logged.map(s => s.id))
    await db.setLogs.where('exerciseLogId').equals(meta.id).filter(s => !keep.has(s.id)).delete()
    await db.setLogs.bulkPut(
      logged.map((s, i) => ({
        id: s.id,
        exerciseLogId: meta.id,
        workoutId: meta.workoutId,
        exerciseId: meta.exerciseId,
        index: i + 1,
        weightKg: s.weightKg,
        reps: s.reps,
        result: s.result!,
        completedAt: s.completedAt ?? Date.now(),
      })),
    )
  })
}

export async function finishExerciseLog(id: string, notes: string) {
  await db.exerciseLogs.update(id, { endedAt: Date.now(), notes: notes.trim() || undefined })
}

async function removeExerciseLogInTx(id: string) {
  await db.setLogs.where('exerciseLogId').equals(id).delete()
  await db.exerciseLogs.delete(id)
}

export async function deleteExerciseLog(id: string) {
  await db.transaction('rw', db.exerciseLogs, db.setLogs, () => removeExerciseLogInTx(id))
}

export async function addCardio(workoutId: string, data: Omit<CardioLog, 'id' | 'workoutId' | 'at'>) {
  await db.cardioLogs.add({ ...data, id: newId(), workoutId, at: Date.now() })
}

export async function addStretch(workoutId: string, durationMin: number) {
  await db.stretchLogs.add({ id: newId(), workoutId, durationMin, at: Date.now() })
}

export async function finishWorkout(id: string, endedAt: number, feeling: 1 | 2 | 3 | 4 | undefined, notes: string) {
  await db.workouts.update(id, { endedAt, feeling, notes: notes.trim() || undefined })
}

export async function discardWorkout(id: string) {
  await db.transaction('rw', [db.workouts, db.exerciseLogs, db.setLogs, db.cardioLogs, db.stretchLogs], async () => {
    await db.setLogs.where('workoutId').equals(id).delete()
    await db.exerciseLogs.where('workoutId').equals(id).delete()
    await db.cardioLogs.where('workoutId').equals(id).delete()
    await db.stretchLogs.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

// ---------- exercise catalog ----------

export async function saveExercise(ex: Omit<Exercise, 'id' | 'createdAt' | 'archived'> & { id?: string }) {
  if (ex.id) {
    await db.exercises.update(ex.id, ex)
    return ex.id
  }
  const id = newId()
  await db.exercises.add({ ...ex, id, archived: false, createdAt: Date.now() })
  return id
}

export async function setExerciseArchived(id: string, archived: boolean) {
  await db.exercises.update(id, { archived })
}
