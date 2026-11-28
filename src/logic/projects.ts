// Projects (any project in your life): a name, steps, progress and links.
//   - Each STEP is a normal task (Task.project_id): it shows in Tasks, and in
//     the calendar if it has a date and time.
//   - PROGRESS = steps done ÷ all steps (½ for a partial one), or the % you
//     set by hand.
//   - LINKS: a tactic of a 12-week goal (its steps then count in that goal's
//     execution %), a subject and one of its exams/projects (study hours), and
//     its own deadline (calendar + deadlines radar, as a "deadline" event).
// Pure functions, tested in projects.test.ts.
import type { CalendarEvent, Cycle, ISODate, Project, Task } from '../data/types'
import { weekNumberOf } from './weeks'

export interface ProjectProgress {
  done: number
  partial: number
  total: number
  /** From the steps (0–1), or null when there are no steps. */
  auto: number | null
  /** What is shown: your own % if you set one, else `auto`. */
  value: number | null
  manual: boolean
}

export function projectProgress(project: Pick<Project, 'manual_progress'>, steps: Task[]): ProjectProgress {
  const done = steps.filter((s) => s.status === 'done').length
  const partial = steps.filter((s) => s.status === 'partial').length
  const total = steps.length
  const auto = total ? (done + partial / 2) / total : null
  const manual = project.manual_progress !== null && project.manual_progress !== undefined
  return { done, partial, total, auto, value: manual ? Math.min(Math.max(project.manual_progress! / 100, 0), 1) : auto, manual }
}

export const PROJECT_EVENT_PREFIX = 'project:'
export const projectIdOfEvent = (eventId: string): string | null =>
  eventId.startsWith(PROJECT_EVENT_PREFIX) ? eventId.slice(PROJECT_EVENT_PREFIX.length) : null

/** The deadline of each open project, as a one-day "deadline" event (calendar + radar). */
export function projectDeadlineEvents(projects: Project[]): CalendarEvent[] {
  return projects
    .filter((p) => p.status === 'active' && p.deadline)
    .map((p) => ({
      id: PROJECT_EVENT_PREFIX + p.id,
      title: `📁 ${p.name}`,
      date: p.deadline!,
      start_time: null,
      end_time: null,
      repeat_weekly: false,
      repeat_until: null,
      kind: 'deadline' as const,
      notes: '',
      color: null,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }))
}

/**
 * The cycle week a new step goes into: the week of its date, or the current
 * week if it has no date. null = the date is outside the cycle.
 */
export function stepWeek(cycle: Pick<Cycle, 'start_date' | 'length_weeks'>, date: ISODate | null, today: ISODate): number | null {
  const week = weekNumberOf(cycle, date ?? today)
  if (week >= 1 && week <= cycle.length_weeks) return week
  if (date) return null
  return week < 1 ? 1 : cycle.length_weeks // today is before/after the cycle: its first/last week
}

/** Open projects first, the closest deadline first (no deadline last), then by name. */
export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort(
    (a, b) =>
      Number(a.status === 'done') - Number(b.status === 'done') ||
      (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') ||
      a.name.localeCompare(b.name),
  )
}
