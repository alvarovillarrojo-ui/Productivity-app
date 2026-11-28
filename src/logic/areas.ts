// Colour areas for the calendar (decided with the owner):
//   - Tasks and blocks of the plan take the colour of their GOAL (as before).
//   - Fixed areas, always there (rename/recolour, never delete):
//       Uni (classes), Day to day, Travel, plus Exams and Deadlines.
//   - You can add more areas (Gym, Run…) and give any event one of them.
//   - Exams (quiz, midterm, final…) are always the Exams colour; deliverables,
//     projects, group work, assignments and "deadline" events the Deadlines
//     colour, so they stand out. All subjects share Uni; the title names it.
// Areas are stored as event categories; a fixed one has `fixed` set.
// Pure functions, tested in areas.test.ts.
import type { CalendarEvent, EventCategory, Exam, FixedArea } from '../data/types'

export const FIXED_AREAS: FixedArea[] = ['uni', 'daily', 'travel', 'exam', 'deadline']
export type { FixedArea }

/** Default colours, chosen apart from the first goal colours (blue, orange, green). */
export const AREA_DEFAULT_COLORS: Record<FixedArea, string> = {
  uni: '#6250d6', // violet
  daily: '#0891b2', // teal
  travel: '#e87ba4', // pink
  exam: '#e34948', // red
  deadline: '#eda100', // amber
}

/** Exams and Deadlines are given automatically; you don't pick them for an event. */
export const isPickableArea = (c: EventCategory): boolean => c.fixed !== 'exam' && c.fixed !== 'deadline'

/** The colour of each fixed area (yours if you changed it, else the default). */
export function areaColors(categories: EventCategory[]): Record<FixedArea, string> {
  const result = { ...AREA_DEFAULT_COLORS }
  for (const c of categories) if (c.fixed && c.fixed in result) result[c.fixed] = c.color
  return result
}

/**
 * An event's colour: its area if it has one, else the colour you chose,
 * else by type (class → Uni, deadline → Deadlines). null = plain grey.
 */
export function resolveEventColor(event: CalendarEvent, categories: EventCategory[], areas = areaColors(categories)): string | null {
  const category = event.category_id ? categories.find((c) => c.id === event.category_id) : undefined
  if (category) return category.color
  if (event.color) return event.color
  if (event.kind === 'class') return areas.uni
  if (event.kind === 'deadline') return areas.deadline
  return null
}

/** Exams are "exam"; anything handed in (and each extra date of a project) is "deadline". */
export function examArea(exam: Pick<Exam, 'kind'>, isDeliverable: boolean): 'exam' | 'deadline' {
  if (isDeliverable) return 'deadline'
  return exam.kind === 'assignment' || exam.kind === 'project' || exam.kind === 'group' ? 'deadline' : 'exam'
}

/** The fixed areas that are missing (to be created, e.g. on first start). */
export const missingFixedAreas = (categories: EventCategory[]): FixedArea[] =>
  FIXED_AREAS.filter((a) => !categories.some((c) => c.fixed === a))
