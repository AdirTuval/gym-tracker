import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { CARDIO_KINDS, EXERCISES } from './catalog'
import { db } from './db'
import type { CardioLog, Exercise, ExerciseLog, GroupId, MuscleGroup, SetLog, StretchLog, Workout } from './types'
import { startOfWeek } from '../lib/format'

export const volumeOf = (sets: Pick<SetLog, 'weightKg' | 'reps'>[]) => sets.reduce((a, s) => a + s.weightKg * s.reps, 0)
export const topWeight = (sets: Pick<SetLog, 'weightKg'>[]) => sets.reduce((a, s) => Math.max(a, s.weightKg), 0)

// ---------- home ----------

export interface WorkoutSummary {
  workout: Workout
  groups: GroupId[]
  exerciseCount: number
  volume: number
  durationMin: number
  extras: string[]
}

async function summarize(w: Workout): Promise<WorkoutSummary> {
  const [logs, sets, cardio, stretch] = await Promise.all([
    db.exerciseLogs.where('workoutId').equals(w.id).toArray(),
    db.setLogs.where('workoutId').equals(w.id).toArray(),
    db.cardioLogs.where('workoutId').equals(w.id).toArray(),
    db.stretchLogs.where('workoutId').equals(w.id).toArray(),
  ])
  return {
    workout: w,
    groups: [...new Set(logs.map(l => l.groupId))],
    exerciseCount: logs.length,
    volume: volumeOf(sets),
    durationMin: Math.max(1, Math.round(((w.endedAt ?? Date.now()) - w.startedAt) / 60000)),
    extras: [
      ...cardio.map(c => `${CARDIO_KINDS[c.kind]} ${c.durationMin}׳`),
      ...stretch.map(s => `גמישות ${s.durationMin}׳`),
    ],
  }
}

export function useHomeData() {
  return useLiveQuery(async () => {
    const finished = (w: Workout) => !!w.endedAt
    const weekStart = startOfWeek(Date.now())
    const thisWeek = await db.workouts.where('startedAt').aboveOrEqual(weekStart).filter(finished).toArray()
    const latest = await db.workouts.orderBy('startedAt').reverse().filter(finished).limit(5).toArray()
    const active = await db.workouts.orderBy('startedAt').reverse().filter(w => !w.endedAt).first()
    return {
      weekCount: thisWeek.length,
      weekDays: new Set(thisWeek.map(w => new Date(w.startedAt).getDay())),
      recent: await Promise.all(latest.map(summarize)),
      active: active ? await summarize(active) : undefined,
      finishedWorkouts: await db.workouts.filter(finished).count(),
    }
  }, [])
}

// ---------- one workout ----------

export type TimelineItem =
  | { type: 'exercise'; at: number; log: ExerciseLog; sets: SetLog[]; exercise?: Exercise }
  | { type: 'cardio'; at: number; log: CardioLog }
  | { type: 'stretch'; at: number; log: StretchLog }

export interface WorkoutView {
  workout: Workout
  groups: MuscleGroup[]
  doneGroups: Map<GroupId, { exercise?: Exercise; sets: SetLog[] }> // latest exercise per group
  timeline: TimelineItem[]
  exerciseCount: number
  setCount: number
  volume: number
  lastActivityAt: number
}

export function useWorkoutView(workoutId: string) {
  return useLiveQuery(async (): Promise<WorkoutView | null> => {
    const workout = await db.workouts.get(workoutId)
    if (!workout) return null
    const [groups, logs, sets, cardio, stretch] = await Promise.all([
      db.groups.orderBy('order').toArray(),
      db.exerciseLogs.where('workoutId').equals(workoutId).sortBy('order'),
      db.setLogs.where('workoutId').equals(workoutId).toArray(),
      db.cardioLogs.where('workoutId').equals(workoutId).toArray(),
      db.stretchLogs.where('workoutId').equals(workoutId).toArray(),
    ])
    const exercises = new Map((await db.exercises.bulkGet([...new Set(logs.map(l => l.exerciseId))])).filter(Boolean).map(e => [e!.id, e!]))
    const setsByLog = new Map<string, SetLog[]>()
    for (const s of sets.sort((a, b) => a.index - b.index)) setsByLog.set(s.exerciseLogId, [...(setsByLog.get(s.exerciseLogId) ?? []), s])

    const timeline: TimelineItem[] = [
      ...logs.map(l => ({ type: 'exercise' as const, at: l.startedAt, log: l, sets: setsByLog.get(l.id) ?? [], exercise: exercises.get(l.exerciseId) })),
      ...cardio.map(c => ({ type: 'cardio' as const, at: c.at, log: c })),
      ...stretch.map(s => ({ type: 'stretch' as const, at: s.at, log: s })),
    ].sort((a, b) => a.at - b.at)

    const doneGroups: WorkoutView['doneGroups'] = new Map()
    for (const l of logs) doneGroups.set(l.groupId, { exercise: exercises.get(l.exerciseId), sets: setsByLog.get(l.id) ?? [] })

    const activity = [workout.startedAt, ...sets.map(s => s.completedAt), ...logs.map(l => l.endedAt ?? 0), ...cardio.map(c => c.at), ...stretch.map(s => s.at)]
    return {
      workout, groups, doneGroups, timeline,
      exerciseCount: logs.length,
      setCount: sets.length,
      volume: volumeOf(sets),
      lastActivityAt: Math.max(...activity),
    }
  }, [workoutId])
}

// ---------- one exercise ----------

export interface Session { log: ExerciseLog; sets: SetLog[] }

/** All past sessions of an exercise, oldest first. */
export async function exerciseHistory(exerciseId: string, excludeWorkoutId?: string): Promise<Session[]> {
  const logs = await db.exerciseLogs
    .where('[exerciseId+startedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .filter(l => l.workoutId !== excludeWorkoutId)
    .toArray()
  const sessions = await Promise.all(logs.map(async log => ({ log, sets: await db.setLogs.where('exerciseLogId').equals(log.id).sortBy('index') })))
  return sessions.filter(s => s.sets.length > 0)
}

const CATALOG_ORDER = new Map(EXERCISES.map((e, i) => [e.id, i]))
/** Catalog exercises in their original order, then ones added later by creation time. */
export const exerciseRank = (e: Exercise) => CATALOG_ORDER.get(e.id) ?? CATALOG_ORDER.size + e.createdAt

export interface PickerRow { exercise: Exercise; last?: Session }

export function useGroupExercises(groupId: GroupId | undefined, includeArchived = false) {
  return useLiveQuery(async () => {
    if (!groupId) return []
    const list = await db.exercises.where('groupId').equals(groupId).filter(e => includeArchived || !e.archived).toArray()
    const rows: PickerRow[] = await Promise.all(list.map(async exercise => {
      const log = await db.exerciseLogs
        .where('[exerciseId+startedAt]')
        .between([exercise.id, Dexie.minKey], [exercise.id, Dexie.maxKey])
        .last()
      return { exercise, last: log ? { log, sets: await db.setLogs.where('exerciseLogId').equals(log.id).sortBy('index') } : undefined }
    }))
    // most recently used first, then never-used ones in catalog order, then ones added later
    return rows.sort((a, b) => (b.last?.log.startedAt ?? 0) - (a.last?.log.startedAt ?? 0) || exerciseRank(a.exercise) - exerciseRank(b.exercise))
  }, [groupId, includeArchived])
}
