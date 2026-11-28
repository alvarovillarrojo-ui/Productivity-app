// Within a subject: what the study time was for, a topic or an exam/project.
// Used on tasks, free pomodoros and time logged by hand, so the Studies tab
// can show hours per topic and per exam.
import * as repo from '../data/repo'
import { useLive } from '../data/useLive'
import type { Exam, Topic } from '../data/types'
import { useI18n } from '../i18n'
import { parseStudyTarget, studyTargetKey } from '../logic/study'

export type StudyTarget = { topic_id: string | null; exam_id: string | null }

export default function StudyTargetSelect({
  subjectId,
  value,
  onChange,
  disabled,
}: {
  subjectId: string | null
  value: StudyTarget
  onChange: (target: StudyTarget) => void
  disabled?: boolean
}) {
  const { t } = useI18n()
  const s = t.students
  const topics = useLive(() => (subjectId ? repo.listTopics(subjectId) : Promise.resolve([])), [subjectId], [] as Topic[])
  const exams = useLive(() => (subjectId ? repo.listExams(subjectId) : Promise.resolve([])), [subjectId], [] as Exam[])
  if (!subjectId || (topics.length === 0 && exams.length === 0)) return null
  return (
    <select aria-label={s.studyFor} value={studyTargetKey(value)} disabled={disabled} onChange={(e) => onChange(parseStudyTarget(e.target.value))}>
      <option value="">{s.studyForGeneral}</option>
      {topics.length > 0 && (
        <optgroup label={s.topics}>
          {topics.map((x) => (
            <option key={x.id} value={`topic:${x.id}`}>
              {x.name}
            </option>
          ))}
        </optgroup>
      )}
      {exams.length > 0 && (
        <optgroup label={s.exams}>
          {exams.map((x) => (
            <option key={x.id} value={`exam:${x.id}`}>
              {x.title || s.kinds[x.kind]}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}
