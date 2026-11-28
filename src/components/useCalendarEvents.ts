// Calendar events (coloured by area, see logic/areas.ts) + exams (as one-off events), for the Calendar and the Day
// screen's deadlines radar. `subjectOfEvent` tells which subject an exam
// event belongs to, so clicking it can open the subject.
import * as repo from '../data/repo'
import { useLive } from '../data/useLive'
import type { CalendarEvent, EventCategory, Exam, Subject } from '../data/types'
import { useI18n } from '../i18n'
import { examEvents, examIdOfEvent } from '../logic/study'
import { goalColor } from './colors'
import { areaColors, examArea, resolveEventColor } from '../logic/areas'

export const subjectColorOf = (s: Subject, index: number): string => s.color ?? goalColor(index)

export function useCalendarEvents(): {
  events: CalendarEvent[]
  categories: EventCategory[]
  subjectOfEvent: (id: string) => string | null
} {
  const { t } = useI18n()
  const stored = useLive(repo.listEvents, [], [] as CalendarEvent[])
  const categories = useLive(repo.listCategories, [], [] as EventCategory[])
  // Every event gets its final colour here (area → chosen colour → type); null = grey.
  const areas = areaColors(categories)
  const events = stored.map((e) => ({ ...e, color: resolveEventColor(e, categories, areas) }))
  const exams = useLive(() => repo.listExams(), [], [] as Exam[])
  const subjects = useLive(repo.listSubjects, [], [] as Subject[])
  const asEvents = examEvents(
    exams.filter((e) => !subjects.find((s) => s.id === e.subject_id)?.archived),
    subjects,
    (k) => t.students.kinds[k],
    (exam, isDeliverable) => areas[examArea(exam, isDeliverable)],
  )
  const subjectOfEvent = (id: string) => {
    const examId = examIdOfEvent(id)
    return examId ? (exams.find((e) => e.id === examId)?.subject_id ?? null) : null
  }
  return { events: [...events, ...asEvents], categories, subjectOfEvent }
}
