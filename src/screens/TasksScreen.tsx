// Tasks screen: the weekly to-do list.
// - Week selector (defaults to the current week; remembered in the address,
//   e.g. #/tasks?week=3)
// - Quick-add form
// - List with one-click done/missed, edit and delete
// - Bulk actions: generate recurring tasks, copy unfinished tasks to next week
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useGoals, useTactics, useWeekTasks } from '../data/hooks'
import type { Cycle, Goal, Tactic } from '../data/types'
import { useI18n } from '../i18n'
import NoActiveCycle from '../components/NoActiveCycle'
import NumberField from '../components/NumberField'
import TacticSelect, { tacticLabel } from '../components/TacticSelect'
import TaskEditForm from '../components/TaskEditForm'
import TaskRow from '../components/TaskRow'
import { pctClass } from '../components/pctClass'
import { execution, formatPct, isDue, taskCounts } from '../logic/metrics'
import { recurringTasks, unfinishedCopies } from '../logic/taskActions'
import { defaultWeek, todayISO, weekEnd, weekStart } from '../logic/weeks'

export default function TasksScreen() {
  const cycle = useActiveCycle()
  if (cycle === undefined) return null
  if (cycle === null) return <NoActiveCycle />
  return <TasksForCycle cycle={cycle} />
}

function TasksForCycle({ cycle }: { cycle: Cycle }) {
  const { t, date } = useI18n()
  const today = todayISO()
  const [params, setParams] = useSearchParams()
  const requested = Number(params.get('week'))
  const week =
    Number.isInteger(requested) && requested >= 1 && requested <= cycle.length_weeks
      ? requested
      : defaultWeek(cycle, today)
  const setWeek = (w: number) => setParams({ week: String(w) }, { replace: true })

  const goals = useGoals(cycle.id)
  const tactics = useTactics(cycle.id)
  const tasks = useWeekTasks(cycle.id, week)
  const nextWeekTasks = useWeekTasks(cycle.id, week + 1)
  const [editing, setEditing] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const first = weekStart(cycle, week)
  const last = weekEnd(cycle, week)
  const counts = taskCounts(tasks)
  const exec = execution(tasks, last, today)
  const isLastWeek = week === cycle.length_weeks

  const flash = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 4000)
  }

  const generate = async () => {
    const created = recurringTasks(cycle.id, week, tactics, tasks)
    if (created.length === 0) return flash(t.tasks.nothingToGenerate)
    await repo.createTasks(created)
    flash(t.tasks.generated(created.length))
  }

  const copyUnfinished = async () => {
    const copies = unfinishedCopies(tasks, nextWeekTasks)
    if (copies.length === 0) return flash(t.tasks.nothingToCopy)
    if (!confirm(t.tasks.confirmCopy(copies.length, week + 1))) return
    await repo.createTasks(copies)
    flash(t.tasks.copied(copies.length, week + 1))
  }

  const remove = (id: string, title: string) => {
    if (confirm(t.tasks.confirmDelete(title))) repo.deleteTask(id)
  }

  return (
    <section className="stack">
      <div className="row spread">
        <h1>{t.tasks.title}</h1>
        <div className="row week-picker">
          <button className="btn" aria-label={t.tasks.prevWeek} disabled={week <= 1} onClick={() => setWeek(week - 1)}>
            ‹
          </button>
          <select aria-label={t.tasks.week} value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {Array.from({ length: cycle.length_weeks }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                {t.tasks.weekOption(w, date(weekStart(cycle, w)))}
                {w === defaultWeek(cycle, today) ? t.tasks.current : ''}
              </option>
            ))}
          </select>
          <button className="btn" aria-label={t.tasks.nextWeek} disabled={isLastWeek} onClick={() => setWeek(week + 1)}>
            ›
          </button>
        </div>
      </div>
      <p className="muted">
        {date(first)} – {date(last)} · {t.tasks.summary(counts.done, counts.missed, counts.open)}{' '}
        <span className={pctClass(exec.pct)}>{formatPct(exec.pct)}</span>
      </p>

      <QuickAdd cycle={cycle} week={week} goals={goals} tactics={tactics} minDate={first} maxDate={last} />

      {tasks.length === 0 ? (
        <p className="muted">{t.tasks.empty}</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) =>
            editing === task.id ? (
              <TaskEditForm
                key={task.id}
                task={task}
                goals={goals}
                tactics={tactics}
                minDate={first}
                maxDate={last}
                onClose={() => setEditing(null)}
              />
            ) : (
              <TaskRow
                key={task.id}
                task={task}
                context={tacticLabel(task.tactic_id, goals, tactics, t.common.other)}
                overdue={task.status === 'todo' && isDue(task, last, today)}
                onEdit={() => setEditing(task.id)}
                onDelete={() => remove(task.id, task.title)}
              />
            ),
          )}
        </ul>
      )}

      <div className="row">
        <button className="btn" onClick={generate}>
          {t.tasks.generate}
        </button>
        <button className="btn" onClick={copyUnfinished} disabled={isLastWeek}>
          {t.tasks.copyTo(isLastWeek ? '–' : String(week + 1))}
        </button>
        {message && <span className="flash">{message}</span>}
      </div>
    </section>
  )
}

// ---------- quick add ----------

interface QuickAddProps {
  cycle: Cycle
  week: number
  goals: Goal[]
  tactics: Tactic[]
  minDate: string
  maxDate: string
}

/**
 * Title + tactic + optional date/hours, Enter to add. The chosen tactic is
 * kept after adding, so several tasks for the same tactic are quick to enter.
 */
function QuickAdd({ cycle, week, goals, tactics, minDate, maxDate }: QuickAddProps) {
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
      <input
        type="date"
        aria-label={t.tasks.dateOptional}
        min={minDate}
        max={maxDate}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <NumberField className="num small" ariaLabel={t.tasks.hoursOptional} placeholder="h" value={hours} onChange={setHours} />
      <button className="btn primary" type="submit" disabled={!title.trim() || !dateOk}>
        {t.common.add}
      </button>
      {!dateOk && <span className="bad">{t.tasks.dateInWeek}</span>}
    </form>
  )
}
