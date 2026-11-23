// Tasks screen: the weekly to-do list.
// - Week selector (defaults to the current week; remembered in the address,
//   e.g. #/tasks?week=3)
// - Quick-add form
// - List with one-click done/missed, edit and delete
// - Recurring tasks are created automatically (see repo.ensureRecurringTasks)
// - Bulk action: copy unfinished tasks to next week
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useGoals, useTactics, useWeekTasks } from '../data/hooks'
import type { Cycle } from '../data/types'
import { useI18n } from '../i18n'
import NoActiveCycle from '../components/NoActiveCycle'
import QuickAdd from '../components/QuickAdd'
import { tacticLabel } from '../components/TacticSelect'
import TaskEditForm from '../components/TaskEditForm'
import TaskRow from '../components/TaskRow'
import HabitsPanel from './HabitsPanel'
import { pctClass } from '../components/pctClass'
import { execution, formatPct, isDue, taskCounts } from '../logic/metrics'
import { unfinishedCopies } from '../logic/taskActions'
import { defaultWeek, todayISO, weekEnd, weekStart } from '../logic/weeks'

export default function TasksScreen() {
  const { t } = useI18n()
  const cycle = useActiveCycle()
  // Two tabs: this week's tasks (default) and habits (#/tasks?view=habits).
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'habits' ? 'habits' : 'week'
  const tab = (id: 'week' | 'habits', label: string) => (
    <button
      role="tab"
      aria-selected={view === id}
      className={view === id ? 'tab on' : 'tab'}
      onClick={() => setParams(id === 'habits' ? { view: 'habits' } : {}, { replace: true })}
    >
      {label}
    </button>
  )
  return (
    <>
      <div className="tabs" role="tablist">
        {tab('week', t.habits.tabWeek)}
        {tab('habits', t.habits.tabHabits)}
      </div>
      {view === 'habits' ? (
        <HabitsPanel />
      ) : cycle === undefined ? null : cycle === null ? (
        <NoActiveCycle />
      ) : (
        <TasksForCycle cycle={cycle} />
      )}
    </>
  )
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
      <p className="muted small-text">↻ {t.tasks.autoRecurring}</p>

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
        <button className="btn" onClick={copyUnfinished} disabled={isLastWeek}>
          {t.tasks.copyTo(isLastWeek ? '–' : String(week + 1))}
        </button>
        {message && <span className="flash">{message}</span>}
      </div>
    </section>
  )
}
