// Colours shared by several screens, so each goal keeps the same colour in
// Tracking and in the Calendar (by goal order: 1st goal blue, 2nd orange…).
export const GOAL_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
export const OVERALL_COLOR = '#1f2937'
/** Calendar events (classes, exams…) that aren't tasks. */
export const EVENT_COLOR = '#64748b'
export const goalColor = (i: number): string => GOAL_COLORS[i % GOAL_COLORS.length]

/** Colours offered in the pickers (goals and calendar events). */
export const PICKER_COLORS = [...GOAL_COLORS, '#0891b2', '#64748b', '#1f2937']

/** A goal's colour: the one chosen, or the automatic one by its order. */
export const goalColorOf = (goal: { color?: string | null }, index: number): string => goal.color ?? goalColor(index)

/** An event's colour: the one chosen, or grey. */
export const eventColorOf = (event: { color?: string | null }): string => event.color ?? EVENT_COLOR
