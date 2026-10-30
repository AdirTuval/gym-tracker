import type { CardioKind, Exercise, GroupId, MuscleGroup } from './types'

// Seeded into the database on first launch. After that the database is the source of truth.
export const GROUPS: MuscleGroup[] = [
  { id: 'back', name: 'גב', order: 1, defaultSets: 3, defaultReps: 8, color: '#5B8CFF' },
  { id: 'chest', name: 'חזה', order: 2, defaultSets: 3, defaultReps: 8, color: '#FF7A59' },
  { id: 'legs', name: 'רגליים', order: 3, defaultSets: 3, defaultReps: 8, color: '#B98BFF' },
  { id: 'shoulders', name: 'כתפיים', order: 4, defaultSets: 3, defaultReps: 8, color: '#FFC24A' },
  { id: 'biceps', name: 'יד קדמית', order: 5, defaultSets: 2, defaultReps: 12, color: '#36D6C3' },
  { id: 'triceps', name: 'יד אחורית', order: 6, defaultSets: 2, defaultReps: 12, color: '#FF6FAE' },
]

type Seed = [id: string, groupId: GroupId, name: string, equipment: string, weightStep: number, isBodyweight?: boolean]
const SEED: Seed[] = [
  ['pullup', 'back', 'מתח', 'משקל גוף', 2.5, true],
  ['lat-pulldown', 'back', 'פולי עליון', 'כבל', 2.5],
  ['cable-row', 'back', 'חתירה בכבל בישיבה', 'כבל', 2.5],
  ['db-row', 'back', 'חתירה עם דאמבל', 'דאמבל', 2],
  ['db-bench', 'chest', 'לחיצת חזה עם דאמבלים', 'משקולות חופשיות', 2],
  ['machine-press', 'chest', 'לחיצת חזה במכונה', 'מכונה', 2.5],
  ['db-squat', 'legs', 'סקוואט עם דאמבלים', 'דאמבלים', 2],
  ['leg-press', 'legs', 'לחיצת רגליים', 'מכונה', 5],
  ['leg-extension', 'legs', 'פשיטת ירך', 'מכונה', 2.5],
  ['db-shoulder-press', 'shoulders', 'לחיצת כתפיים עם דאמבלים בישיבה', 'דאמבלים', 2],
  ['lateral-raise', 'shoulders', 'הרחקת כתפיים', 'דאמבלים', 1],
  ['standing-curl', 'biceps', 'כפיפת מרפקים בעמידה', 'דאמבלים', 1],
  ['incline-curl', 'biceps', 'כפיפת מרפקים בשכיבה 45°', 'דאמבלים', 1],
  ['cable-pushdown', 'triceps', 'פשיטת מרפקים בפולי בעמידה', 'כבל', 2.5],
  ['seated-db-extension', 'triceps', 'פשיטת מרפקים עם דאמבל בישיבה', 'דאמבל', 2],
]

export const EXERCISES: Exercise[] = SEED.map(([id, groupId, name, equipment, weightStep, isBodyweight]) => ({
  id, groupId, name, equipment, weightStep, isBodyweight: !!isBodyweight, archived: false, createdAt: 0,
}))

export const CARDIO_KINDS: Record<CardioKind, string> = {
  incline_walk: 'הליכה בשיפוע',
  run: 'ריצה',
  bike: 'אופניים',
  elliptical: 'אליפטיקל',
  rower: 'חתירה',
}
