import Dexie, { type EntityTable } from 'dexie'
import { EXERCISES, GROUPS } from './catalog'
import type { CardioLog, Exercise, ExerciseLog, MuscleGroup, SetLog, StretchLog, Workout } from './types'

export const db = new Dexie('gym-tracker') as Dexie & {
  groups: EntityTable<MuscleGroup, 'id'>
  exercises: EntityTable<Exercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  exerciseLogs: EntityTable<ExerciseLog, 'id'>
  setLogs: EntityTable<SetLog, 'id'>
  cardioLogs: EntityTable<CardioLog, 'id'>
  stretchLogs: EntityTable<StretchLog, 'id'>
}

// Schema changes need a new db.version(n) with an upgrade, never an edit of an old version.
db.version(1).stores({
  groups: 'id, order',
  exercises: 'id, groupId',
  workouts: 'id, startedAt',
  exerciseLogs: 'id, workoutId, exerciseId, [exerciseId+startedAt]',
  setLogs: 'id, exerciseLogId, workoutId, exerciseId',
  cardioLogs: 'id, workoutId',
  stretchLogs: 'id, workoutId',
})

db.on('populate', async tx => {
  await tx.table('groups').bulkAdd(GROUPS)
  await tx.table('exercises').bulkAdd(EXERCISES)
})

export const newId = () => crypto.randomUUID()

// Ask iOS not to evict our data under storage pressure.
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    /* not supported: nothing to do */
  }
}
