// Pick a subject (Students tab) for a task or a free pomodoro, and a small
// tag that shows a task's subject in task lists.
import * as repo from '../data/repo'
import { useLive } from '../data/useLive'
import type { Subject } from '../data/types'
import { useI18n } from '../i18n'
import { subjectColorOf } from './useCalendarEvents'

const useSubjects = () => useLive(repo.listSubjects, [], [] as Subject[])

export default function SubjectSelect({
  value,
  onChange,
  disabled,
}: {
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
}) {
  const { t } = useI18n()
  const subjects = useSubjects().filter((s) => !s.archived || s.id === value)
  if (subjects.length === 0) return null
  return (
    <select aria-label={t.students.subject} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{t.students.noSubject}</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}

export function SubjectTag({ id }: { id: string }) {
  const subjects = useSubjects()
  const index = subjects.findIndex((s) => s.id === id)
  if (index < 0) return null
  const s = subjects[index]
  return (
    <span className="subject-tag">
      <span className="dot-color" style={{ background: subjectColorOf(s, index), margin: 0 }} />
      {s.name}
    </span>
  )
}
