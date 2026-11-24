// Calendar events + exams (as one-off events), for the Calendar and the Day
// screen's deadlines radar. `subjectOfEvent` tells which subject an exam
// event belongs to, so clicking it can open the subject.
import * as repo from '../data/repo'
import { useLive } from '../data/useLive'
import type { CalendarEvent, Exam, Subject } from '../data/types'
import { useI18n } from '../i18n'
import { EXAM_EVENT_PREFIX, examEvents } from '../logic/study'
import { goalColor } from './colors'

export const subjectColorOf = (s: Subject, index: number): string => s.color ?? goalColor(index)

export function useCalendarEvents(): { events: CalendarEvent[]; subjectOfEvent: (id: string) => string | null } {
  const { t } = useI18n()
  const events = useLive(repo.listEvents, [], [] as CalendarEvent[])
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
  return { events: [...events, ...asEvents], subjectOfEvent }
}
