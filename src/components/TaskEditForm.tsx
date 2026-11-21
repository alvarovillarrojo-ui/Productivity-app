// Edit all fields of a task. Shown in place of the task row.
import { useState } from 'react'
import { updateTask } from '../data/repo'
import type { Goal, Tactic, Task } from '../data/types'
import { useI18n } from '../i18n'
import NumberField from './NumberField'
import TacticSelect from './TacticSelect'

interface Props {
  task: Task
  goals: Goal[]
  tactics: Tactic[]
  /** First and last day of the task's week (date must be inside). */
  minDate: string
  maxDate: string
  onClose: () => void
}

export default function TaskEditForm({ task, goals, tactics, minDate, maxDate, onClose }: Props) {
  const { t } = useI18n()
  const [form, setForm] = useState(task)
  const set = (patch: Partial<Task>) => setForm({ ...form, ...patch })
  const dateOk = !form.planned_date || (form.planned_date >= minDate && form.planned_date <= maxDate)
  const valid = form.title.trim() !== '' && dateOk

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    await updateTask(task.id, {
      title: form.title.trim(),
      tactic_id: form.tactic_id,
      planned_date: form.planned_date || null,
      planned_hours: form.planned_hours,
      actual_hours: form.actual_hours,
      notes: form.notes,
    })
    onClose()
  }

  return (
    <li className="task-edit">
      <form className="stack" onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="row">
          <input
            className="grow"
            aria-label={t.tasks.edit.title}
            value={form.title}
            autoFocus
            onChange={(e) => set({ title: e.target.value })}
          />
          <TacticSelect goals={goals} tactics={tactics} value={form.tactic_id} onChange={(id) => set({ tactic_id: id })} />
        </div>
        <div className="row">
          <label className="field">
            <span>{t.tasks.edit.date}</span>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={form.planned_date ?? ''}
              onChange={(e) => set({ planned_date: e.target.value || null })}
            />
          </label>
          <label className="field">
            <span>{t.tasks.edit.plannedH}</span>
            <NumberField className="num small" value={form.planned_hours} placeholder="–" onChange={(v) => set({ planned_hours: v })} />
          </label>
          <label className="field">
            <span>{t.tasks.edit.actualH}</span>
            <NumberField className="num small" value={form.actual_hours} placeholder="–" onChange={(v) => set({ actual_hours: v })} />
          </label>
          <label className="field grow">
            <span>{t.tasks.edit.notes}</span>
            <input value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </label>
        </div>
        {!dateOk && <p className="bad">{t.tasks.edit.dateInWeek}</p>}
        <div className="row">
          <button className="btn primary" type="submit" disabled={!valid}>
            {t.common.save}
          </button>
          <button className="btn" type="button" onClick={onClose}>
            {t.common.cancel}
          </button>
        </div>
      </form>
    </li>
  )
}
