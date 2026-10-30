import { useLiveQuery } from 'dexie-react-hooks'
import { CARDIO_KINDS } from './catalog'
import { db } from './db'
import type { GroupId, SetLog, Workout } from './types'
import { startOfWeek } from '../lib/format'

export const volumeOf = (sets: Pick<SetLog, 'weightKg' | 'reps'>[]) => sets.reduce((a, s) => a + s.weightKg * s.reps, 0)

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
    return {
      weekCount: thisWeek.length,
      weekDays: new Set(thisWeek.map(w => new Date(w.startedAt).getDay())),
      recent: await Promise.all(latest.map(summarize)),
    }
  }, [])
}
