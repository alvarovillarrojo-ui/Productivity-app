// Students tab calculations. Pure functions, all tested.
//
//   - WEIGHTED AVERAGE of a subject: Σ(grade × weight) ÷ Σ(weight) over the
//     exams that already have a grade. If no weights are given, a simple
//     average. The overall average is the mean of the subjects' averages.
//   - STUDY HOURS of a subject: actual hours of tasks linked to it, plus free
//     pomodoros (no task) given that subject. Pomodoros on a task are already
//     in the task's hours, so they are not counted twice.
//   - EXAMS also appear in the calendar and the deadlines radar, as events.
import type { CalendarEvent, Deliverable, Exam, FocusSession, ISODate, Subject, Task, Topic } from '../data/types'
import { daysBetween } from './weeks'

export interface GradeSummary {
  /** Weighted average 0–10, or null when nothing is graded yet. */
  average: number | null
  /** % of the final grade already graded (when weights are known). */
  gradedWeight: number
  /** % of the final grade covered by all exams with a weight. */
  totalWeight: number
}

export function subjectGrades(exams: Exam[]): GradeSummary {
  const graded = exams.filter((e) => e.grade !== null)
  const weighted = graded.filter((e) => e.weight !== null && e.weight > 0)
  let average: number | null = null
  if (weighted.length > 0) {
    const w = weighted.reduce((s, e) => s + e.weight!, 0)
    average = weighted.reduce((s, e) => s + e.grade! * e.weight!, 0) / w
  } else if (graded.length > 0) {
    average = graded.reduce((s, e) => s + e.grade!, 0) / graded.length
  }
  return {
    average,
    gradedWeight: weighted.reduce((s, e) => s + e.weight!, 0),
    totalWeight: exams.reduce((s, e) => s + (e.weight ?? 0), 0),
  }
}

/** Mean of the subjects' averages (subjects without grades are left out). */
export function overallAverage(averages: (number | null)[]): number | null {
  const known = averages.filter((a): a is number => a !== null)
  return known.length ? known.reduce((s, a) => s + a, 0) / known.length : null
}

/**
 * Study hours of a subject. `inRange` decides which tasks/sessions count
 * (e.g. this week); by default all of them.
 */
export function studyHours(
  subjectId: string,
  tasks: Task[],
  sessions: FocusSession[],
  inRange: { task?: (t: Task) => boolean; session?: (s: FocusSession) => boolean } = {},
): number {
  const fromTasks = tasks
    .filter((t) => t.subject_id === subjectId && (inRange.task?.(t) ?? true))
    .reduce((s, t) => s + (t.actual_hours ?? 0), 0)
  const fromFocus = sessions
    .filter((s) => s.task_id === null && s.subject_id === subjectId && (inRange.session?.(s) ?? true))
    .reduce((sum, s) => sum + s.minutes / 60, 0)
  return Math.round((fromTasks + fromFocus) * 100) / 100
}

/** One date of an exam: its main date, or one of its deliverables. */
export interface ExamDate {
  exam: Exam
  date: ISODate
  start_time: string | null
  /** The deliverable (e.g. "Presentation"), or null for the main date. */
  deliverable: Deliverable | null
}

/** All dates of these exams (main dates + deliverables), soonest first. */
export function examDates(exams: Exam[]): ExamDate[] {
  return exams
    .flatMap((exam) => [
      { exam, date: exam.date, start_time: exam.start_time, deliverable: null },
      ...(exam.deliverables ?? []).map((d) => ({ exam, date: d.date, start_time: d.start_time, deliverable: d })),
    ])
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))
}

/** The next exam date (or deliverable) on or after today, with days left. */
export function nextExam(exams: Exam[], today: ISODate): (ExamDate & { daysLeft: number }) | null {
  const next = examDates(exams).find((d) => d.date >= today)
  return next ? { ...next, daysLeft: daysBetween(today, next.date) } : null
}

/** Topics still marked difficult (not yet mastered). */
export const difficultTopics = (topics: Topic[]): Topic[] => topics.filter((t) => t.difficult && t.status !== 'mastered')

/** Share of topics mastered, 0–1 (null when there are no topics). */
export function topicProgress(topics: Topic[]): number | null {
  return topics.length ? topics.filter((t) => t.status === 'mastered').length / topics.length : null
}

/** Prefix of the calendar-event id of an exam (so the calendar can open the subject). */
export const EXAM_EVENT_PREFIX = 'exam:'

/** The calendar-event id of an exam date: "exam:<examId>" or "exam:<examId>:<deliverableId>". */
export const examEventId = (examId: string, deliverableId?: string): string =>
  deliverableId ? `${EXAM_EVENT_PREFIX}${examId}:${deliverableId}` : `${EXAM_EVENT_PREFIX}${examId}`

/** The exam id inside an exam event id (null for ordinary events). */
export const examIdOfEvent = (eventId: string): string | null =>
  eventId.startsWith(EXAM_EVENT_PREFIX) ? eventId.slice(EXAM_EVENT_PREFIX.length).split(':')[0] : null

/**
 * Exams (and each project deliverable) as one-off calendar events, 1 h by
 * default, so the calendar and the deadlines radar show them. Titles:
 * "Corporate Finance · Final", "Strategy · Group work — Presentation".
 */
export function examEvents(exams: Exam[], subjects: Subject[], kindLabel: (k: Exam['kind']) => string, color: (s: Subject) => string): CalendarEvent[] {
  const byId = new Map(subjects.map((s) => [s.id, s]))
  const endOf = (start: string | null) => (start ? `${String(Math.min(23, Number(start.slice(0, 2)) + 1)).padStart(2, '0')}${start.slice(2)}` : null)
  return examDates(exams).flatMap(({ exam: e, date, start_time, deliverable }) => {
    const subject = byId.get(e.subject_id)
    if (!subject) return []
    const name = `${subject.name} · ${e.title || kindLabel(e.kind)}`
    return [
      {
        id: examEventId(e.id, deliverable?.id),
        title: deliverable ? `${name} — ${deliverable.title || '…'}` : name,
        date,
        start_time,
        end_time: endOf(start_time),
        repeat_weekly: false,
        kind: 'deadline' as const,
        repeat_until: null,
        notes: '',
        color: color(subject),
        created_at: e.created_at,
        updated_at: e.updated_at,
      },
    ]
  })
}
