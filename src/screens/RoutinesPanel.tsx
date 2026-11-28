// Tasks → Every week: tasks that repeat every week (e.g. "Do the laundry",
// Sunday 10:00). Each one creates a normal task every week of the active
// cycle by itself (see logic/taskActions.ts planRoutines).
import { useRef, useState } from 'react'
import * as repo from '../data/repo'
import { useActiveCycle, useGoals, useTactics } from '../data/hooks'
import { useLive } from '../data/useLive'
import type { Routine } from '../data/types'
import { useI18n } from '../i18n'
import NumberField from '../components/NumberField'
import TacticSelect, { tacticLabel } from '../components/TacticSelect'
import TextField from '../components/TextField'
import { TimeInput } from '../components/DateTimeInput'
import { formatDecimal } from '../logic/numbers'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

export default function RoutinesPanel() {
  const { t, lang, locale } = useI18n()
  const m = t.routines
  const cycle = useActiveCycle()
  const goals = useGoals(cycle?.id)
  const tactics = useTactics(cycle?.id)
  const routines = useLive(repo.listRoutines, [], [] as Routine[])

  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [weekday, setWeekday] = useState<number | null>(null)
  const [time, setTime] = useState('')
  const [hours, setHours] = useState<number | null>(null)
  const [tacticId, setTacticId] = useState<string | null>(null)

  // 5 Jan 2026 was a Monday: day names in your language.
  const dayName = (d: number) => new Date(2026, 0, 4 + d).toLocaleDateString(locale, { weekday: 'long' })

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const data = { title, tactic_id: tacticId, weekday, start_time: weekday && time ? time : null, planned_hours: hours }
    setTitle('') // clear first, so anything typed while saving isn't lost
    setTime('')
    setHours(null)
    titleRef.current?.focus()
    await repo.createRoutine(data)
  }

  const describe = (r: Routine) =>
    [
      r.weekday ? dayName(r.weekday) : m.noDay,
      r.weekday && r.start_time,
      r.planned_hours !== null && `${formatDecimal(r.planned_hours, lang)} h`,
      tacticLabel(r.tactic_id, goals, tactics, t.common.other),
    ]
      .filter(Boolean)
      .join(' · ')

  return (
    <section className="stack">
      <div className="card stack">
        <h2>🔁 {m.title}</h2>
        <p className="muted small-text">{m.hint}</p>
        {cycle === null && <p className="warn small-text">{m.noCycle}</p>}
        <form className="routine-form" onSubmit={add}>
          <input ref={titleRef} className="grow" placeholder={m.placeholder} aria-label={m.name} value={title} onChange={(e) => setTitle(e.target.value)} />
          <select aria-label={m.day} value={weekday ?? ''} onChange={(e) => setWeekday(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{m.noDay}</option>
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {dayName(d)}
              </option>
            ))}
          </select>
          <TimeInput aria-label={m.time} title={weekday ? m.time : m.timeNeedsDay} disabled={!weekday} value={time} onChange={setTime} />
          <NumberField className="num small" ariaLabel={m.hours} placeholder="h" value={hours} onChange={setHours} />
          <TacticSelect goals={goals} tactics={tactics} value={tacticId} onChange={setTacticId} />
          <button className="btn primary" type="submit" disabled={!title.trim()}>
            {t.common.add}
          </button>
        </form>
      </div>

      <div className="card">
        {routines.length === 0 ? (
          <p className="muted">{m.empty}</p>
        ) : (
          <ul className="routine-list">
            {routines.map((r) => (
              <li key={r.id} className={r.active ? '' : 'paused'}>
                <div className="grow">
                  <TextField value={r.title} required ariaLabel={m.name} onSave={(v) => repo.updateRoutine(r.id, { title: v })} />
                  <span className="muted small-text">{describe(r)}</span>
                </div>
                <label className="row small-text">
                  <input type="checkbox" checked={r.active} onChange={(e) => repo.updateRoutine(r.id, { active: e.target.checked })} />
                  {r.active ? m.active : m.paused}
                </label>
                <button className="link danger" onClick={() => confirm(m.confirmDelete(r.title)) && repo.deleteRoutine(r.id)}>
                  {t.common.delete}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
