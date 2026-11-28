// Calendar events (coloured by their category) + exams (as one-off events), for the Calendar and the Day
// screen's deadlines radar. `subjectOfEvent` tells which subject an exam
// event belongs to, so clicking it can open the subject.
import * as repo from '../data/repo'
import { useLive } from '../data/useLive'
import type { CalendarEvent, EventCategory, Exam, Subject } from '../data/types'
import { useI18n } from '../i18n'
import { EXAM_EVENT_PREFIX, examEvents } from '../logic/study'
import { goalColor } from './colors'

export const subjectColorOf = (s: Subject, index: number): string => s.color ?? goalColor(index)

export function useCalendarEvents(): {
  events: CalendarEvent[]
  categories: EventCategory[]
  subjectOfEvent: (id: string) => string | null
} {
  const { t } = useI18n()
  const stored = useLive(repo.listEvents, [], [] as CalendarEvent[])
  const categories = useLive(repo.listCategories, [], [] as EventCategory[])
  // An event with a category takes the category's colour.
  const catColor = new Map(categories.map((c) => [c.id, c.color]))
  const events = stored.map((e) => (e.category_id && catColor.has(e.category_id) ? { ...e, color: catColor.get(e.category_id)! } : e))
  const exams = useLive(() => repo.listExams(), [], [] as Exam[])
  const subjects = useLive(repo.listSubjects, [], [] as Subject[])
  const asEvents = examEvents(
    exams.filter((e) => !subjects.find((s) => s.id === e.subject_id)?.archived),
    subjects,
    (k) => t.students.kinds[k],
    (s) => subjectColorOf(s, subjects.indexOf(s)),
  )
  const subjectOfEvent = (id: string) =>
    id.startsWith(EXAM_EVENT_PREFIX) ? (exams.find((e) => `${EXAM_EVENT_PREFIX}${e.id}` === id)?.subject_id ?? null) : null
  return { events: [...events, ...asEvents], categories, subjectOfEvent }
}
