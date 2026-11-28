// Quick-add form for tasks, used on Home and Tasks.
// Title + tactic + optional date/hours, Enter to add. The chosen tactic is
// kept after adding, so several tasks for the same tactic are quick to enter.
import { useRef, useState } from 'react'
import * as repo from '../data/repo'
import type { Cycle, Goal, Tactic } from '../data/types'
import { useI18n } from '../i18n'
import NumberField from './NumberField'
import TacticSelect from './TacticSelect'
import { DateInput } from './DateTimeInput'

interface Props {
  cycle: Cycle
  week: number
  goals: Goal[]
  tactics: Tactic[]
  /** First and last day of the week (the date must be inside). */
  minDate: string
  maxDate: string
}

export default function QuickAdd({ cycle, week, goals, tactics, minDate, maxDate }: Props) {
  const { t } = useI18n()
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  // undefined = not chosen yet (use the first active tactic);
  // null = "Other"; text = a tactic id.
  const [tacticId, setTacticId] = useState<string | null | undefined>(undefined)
  const [date, setDate] = useState('')
  const [hours, setHours] = useState<number | null>(null)

  const firstActive = tactics.find((x) => x.active)?.id ?? null
  const chosen = tacticId === undefined ? firstActive : tacticId
  const dateOk = !date || (date >= minDate && date <= maxDate)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !dateOk) return
    const task = {
      cycle_id: cycle.id,
      week_number: week,
      title: title.trim(),
      tactic_id: chosen,
      planned_date: date || null,
      planned_hours: hours,
    }
    // Clear the form BEFORE saving, so anything typed while saving isn't lost.
    setTitle('')
    setDate('')
    setHours(null)
    titleRef.current?.focus()
    await repo.createTask(task)
  }

  return (
    <form className="card quick-add" onSubmit={add}>
      <input
        ref={titleRef}
        className="grow"
        placeholder={t.tasks.newPlaceholder}
        aria-label={t.tasks.newTitle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TacticSelect goals={goals} tactics={tactics} value={chosen} onChange={setTacticId} />
      <DateInput
        aria-label={t.tasks.dateOptional}
        min={minDate}
        max={maxDate}
        value={date}
        onChange={(v) => setDate(v)}
      />
      <NumberField className="num small" ariaLabel={t.tasks.hoursOptional} placeholder="h" value={hours} onChange={setHours} />
      <button className="btn primary" type="submit" disabled={!title.trim() || !dateOk}>
        {t.common.add}
      </button>
      {!dateOk && <span className="bad">{t.tasks.dateInWeek}</span>}
    </form>
  )
}
