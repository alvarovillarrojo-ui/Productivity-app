// Students tab calculations. Pure functions, all tested.
//
//   - WEIGHTED AVERAGE of a subject: Σ(grade × weight) ÷ Σ(weight) over the
//     exams that already have a grade. If no weights are given, a simple
//     average. The overall average is the mean of the subjects' averages.
//   - STUDY HOURS of a subject: actual hours of tasks linked to it, plus free
//     pomodoros (no task) given that subject, plus time logged by hand.
//     Pomodoros on a task are already in the task's hours, so they are not
//     counted twice. Each of them can name a topic or an exam/project, which
//     gives the hours per topic and per exam (studyBreakdown).
//   - EXAMS also appear in the calendar and the deadlines radar, as events.
import type { CalendarEvent, Deliverable, Exam, FocusSession, ISODate, StudyLog, Subject, Task, Topic } from '../data/types'
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

/** Which tasks, pomodoros and logs count (e.g. this week); all by default. */
export interface StudyRange {
  task?: (t: Task) => boolean
  session?: (s: FocusSession) => boolean
  log?: (l: StudyLog) => boolean
}

/** One piece of study time: hours, and what it was for. */
interface StudyPiece {
  hours: number
  topic_id: string | null
  exam_id: string | null
}

/** All study time of a subject, from tasks, free pomodoros and logs. */
function studyPieces(subjectId: string, tasks: Task[], sessions: FocusSession[], logs: StudyLog[], inRange: StudyRange): StudyPiece[] {
  const piece = (hours: number, x: { topic_id?: string | null; exam_id?: string | null }): StudyPiece => ({
    hours,
    topic_id: x.topic_id ?? null,
    exam_id: x.exam_id ?? null,
  })
  return [
    ...tasks.filter((t) => t.subject_id === subjectId && (inRange.task?.(t) ?? true)).map((t) => piece(t.actual_hours ?? 0, t)),
    ...sessions
      .filter((s) => s.task_id === null && s.subject_id === subjectId && (inRange.session?.(s) ?? true))
      .map((s) => piece(s.minutes / 60, s)),
    ...logs.filter((l) => l.subject_id === subjectId && (inRange.log?.(l) ?? true)).map((l) => piece(l.hours, l)),
  ]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Study hours of a subject. `inRange` decides which tasks/sessions/logs count
 * (e.g. this week); by default all of them.
 */
export function studyHours(subjectId: string, tasks: Task[], sessions: FocusSession[], inRange: StudyRange = {}, logs: StudyLog[] = []): number {
  return round2(studyPieces(subjectId, tasks, sessions, logs, inRange).reduce((s, p) => s + p.hours, 0))
}

export interface StudyBreakdown {
  /** Hours per topic id (only topics that still exist). */
  topics: Map<string, number>
  /** Hours per exam/project id (only ones that still exist). */
  exams: Map<string, number>
  /** Hours not linked to a topic or exam (or linked to a deleted one). */
  general: number
  total: number
}

/** A subject's study hours split by topic and by exam/project. */
export function studyBreakdown(
  subjectId: string,
  topics: Topic[],
  exams: Exam[],
  tasks: Task[],
  sessions: FocusSession[],
  logs: StudyLog[],
  inRange: StudyRange = {},
): StudyBreakdown {
  const topicIds = new Set(topics.map((t) => t.id))
  const examIds = new Set(exams.map((e) => e.id))
  const r: StudyBreakdown = { topics: new Map(), exams: new Map(), general: 0, total: 0 }
  const add = (m: Map<string, number>, id: string, h: number) => m.set(id, round2((m.get(id) ?? 0) + h))
  for (const p of studyPieces(subjectId, tasks, sessions, logs, inRange)) {
    if (p.hours <= 0) continue
    r.total += p.hours
    if (p.topic_id && topicIds.has(p.topic_id)) add(r.topics, p.topic_id, p.hours)
    else if (p.exam_id && examIds.has(p.exam_id)) add(r.exams, p.exam_id, p.hours)
    else r.general += p.hours
  }
  r.total = round2(r.total)
  r.general = round2(r.general)
  return r
}

/** What a piece of study was for, as one value for a <select>: "topic:id", "exam:id" or "". */
export const studyTargetKey = (x: { topic_id?: string | null; exam_id?: string | null }): string =>
  x.topic_id ? `topic:${x.topic_id}` : x.exam_id ? `exam:${x.exam_id}` : ''

/** The opposite of studyTargetKey. */
export function parseStudyTarget(key: string): { topic_id: string | null; exam_id: string | null } {
  const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
  return { topic_id: kind === 'topic' && id ? id : null, exam_id: kind === 'exam' && id ? id : null }
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
/** `color(exam, isDeliverable)`: e.g. the Exams or Deadlines colour (logic/areas.ts). */
export function examEvents(exams: Exam[], subjects: Subject[], kindLabel: (k: Exam['kind']) => string, color: (exam: Exam, isDeliverable: boolean) => string): CalendarEvent[] {
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
        color: color(e, Boolean(deliverable)),
        created_at: e.created_at,
        updated_at: e.updated_at,
      },
    ]
  })
}
