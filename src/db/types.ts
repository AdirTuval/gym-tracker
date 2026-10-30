// Data model. Keep as much raw data as possible (with timestamps) for future analysis.
// All timestamps are epoch milliseconds.

export type GroupId = 'back' | 'chest' | 'legs' | 'shoulders' | 'biceps' | 'triceps'
export type SetResult = 'success' | 'failure'
export type CardioKind = 'incline_walk' | 'run' | 'bike' | 'elliptical' | 'rower'

export interface MuscleGroup {
  id: GroupId
  name: string
  order: number // big muscles first
  defaultSets: number
  defaultReps: number
  color: string
}

export interface Exercise {
  id: string
  groupId: GroupId
  name: string
  equipment: string
  weightStep: number // kg added per +/- tap
  isBodyweight: boolean // weightKg on its sets means added weight
  archived: boolean
  createdAt: number
}

export interface Workout {
  id: string
  startedAt: number
  endedAt?: number // unset while the workout is in progress
  feeling?: 1 | 2 | 3 | 4 // very hard → great
  notes?: string
}

export interface ExerciseLog {
  id: string
  workoutId: string
  exerciseId: string
  groupId: GroupId // copied from the exercise so history survives regrouping
  order: number // position within the workout (1-based)
  startedAt: number
  endedAt?: number
  notes?: string
}

export interface SetLog {
  id: string
  exerciseLogId: string
  workoutId: string // denormalized for fast queries
  exerciseId: string // denormalized for fast queries
  index: number // 1-based within the exercise
  weightKg: number
  reps: number
  result: SetResult
  completedAt: number
}

export interface CardioLog {
  id: string
  workoutId: string
  kind: CardioKind
  durationMin: number
  incline?: number
  speedKmh?: number
  level?: number
  at: number
}

export interface StretchLog {
  id: string
  workoutId: string
  durationMin: number
  at: number
}
