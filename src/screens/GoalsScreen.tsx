// Goals screen: edit the active cycle, its goals and their tactics.
// Every field saves by itself when you leave it (no Save button).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useCycleTasks, useGoals, useTactics } from '../data/hooks'
import type { Cycle, Goal, Tactic } from '../data/types'
import { useI18n } from '../i18n'
import NumberField from '../components/NumberField'
import TextField from '../components/TextField'
import NoActiveCycle from '../components/NoActiveCycle'
import { cycleEnd, formatWeekday, isMonday, isValidDate, todayISO, weekDates } from '../logic/weeks'
import { MAX_RECOMMENDED_GOALS } from './setup/draft'
import { isValidTime } from '../logic/calendar'
import ColorPicker from '../components/ColorPicker'
import { goalColor } from '../components/colors'
import { useLive } from '../data/useLive'

export default function GoalsScreen() {
  const { t } = useI18n()
  const cycle = useActiveCycle()
  const goals = useGoals(cycle?.id)
  const tactics = useTactics(cycle?.id)

  if (cycle === undefined) return null
  if (cycle === null)
    return (
      <section className="stack">
        <NoActiveCycle />
        <CyclesCard />
      </section>
    )

  const addGoal = () =>
    repo.createGoal({
      cycle_id: cycle.id,
      name: t.goalsScreen.newGoal,
      description: '',
      weekly_hours_target: 0,
      weekly_hours_minimum: null,
    })

  return (
    <section className="stack">
      <div className="row spread">
        <h1>{t.goalsScreen.title}</h1>
        <Link className="btn" to="/setup">
          {t.common.startNewCycle}
        </Link>
      </div>

      <CycleCard cycle={cycle} />

      {goals.length > MAX_RECOMMENDED_GOALS && (
        <p className="warn-box">{t.setup.issue({ code: 'tooManyGoals', count: goals.length })}</p>
      )}

      {goals.map((g, i) => (
        <GoalCard key={g.id} goal={g} index={i} tactics={tactics.filter((x) => x.goal_id === g.id)} />
      ))}

      <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={addGoal}>
        {t.setup.goals.addGoal}
      </button>

      <CyclesCard />
    </section>
  )
}

// ---------- all cycles (with delete) ----------

function CyclesCard() {
  const { t, date } = useI18n()
  const c = t.goalsScreen.cycles
  const cycles = useLive(repo.listCyclesWithCounts, [], [] as Awaited<ReturnType<typeof repo.listCyclesWithCounts>>)
  if (cycles.length === 0) return null

  const remove = async (x: (typeof cycles)[number]) => {
    const message = c.confirmDelete(x.cycle.name, x.goals, x.tasks, x.cycle.status === 'active')
    if (!confirm(message)) return
    await repo.deleteCycle(x.cycle.id)
  }

  return (
    <div className="card stack">
      <h2>{c.title}</h2>
      <p className="muted small-text">{c.hint}</p>
      <ul className="cycle-list">
        {cycles.map((x) => (
          <li key={x.cycle.id} className="row spread">
            <span>
              <strong>{x.cycle.name}</strong>{' '}
              <span className={x.cycle.status === 'active' ? 'badge active' : 'badge'}>{c.status[x.cycle.status]}</span>
              <br />
              <span className="muted small-text">
                {date(x.cycle.start_date)} → {date(cycleEnd(x.cycle))} · {c.counts(x.goals, x.tasks)}
              </span>
            </span>
            <button className="btn danger-outline" onClick={() => remove(x)}>
              {c.delete}
            </button>
          </li>
        ))}
      </ul>
      <Link to="/data?action=backup" className="small-text">
        {c.backupFirst}
      </Link>
    </div>
  )
}

// ---------- cycle ----------

function CycleCard({ cycle }: { cycle: Cycle }) {
  const { t, date } = useI18n()
  const tasks = useCycleTasks(cycle.id)
  const [showVision, setShowVision] = useState(false)
  const [dateError, setDateError] = useState('')
  const save = (changes: Partial<Cycle>) => repo.updateCycle(cycle.id, changes)

  const changeStart = (d: string) => {
    if (!isValidDate(d)) return
    if (!isMonday(d)) return setDateError(t.setup.issue({ code: 'notMonday' }))
    setDateError('')
    if (tasks.length > 0 && !confirm(t.goalsScreen.confirmStartChange)) return
    save({ start_date: d })
  }

  return (
    <div className="card stack">
      <div className="row">
        <label className="field grow">
          <span>{t.goalsScreen.cycleName}</span>
          <TextField value={cycle.name} required onSave={(name) => save({ name })} />
        </label>
        <label className="field">
          <span>{t.goalsScreen.start}</span>
          <input type="date" value={cycle.start_date} onChange={(e) => changeStart(e.target.value)} />
        </label>
        <label className="field">
          <span>{t.goalsScreen.weeks}</span>
          <NumberField
            className="num small"
            value={cycle.length_weeks}
            step={1}
            min={1}
            max={52}
            onChange={(v) => v !== null && Number.isInteger(v) && v >= 1 && v <= 52 && save({ length_weeks: v })}
          />
        </label>
      </div>
      {dateError && <p className="bad">{dateError}</p>}
      <p className="muted">
        {date(cycle.start_date)} → {date(cycleEnd(cycle))}
      </p>
      <label className="field">
        <span>{t.goalsScreen.notes}</span>
        <TextField multiline rows={2} value={cycle.notes} onSave={(notes) => save({ notes })} />
      </label>
      <div>
        <button className="link" onClick={() => setShowVision(!showVision)}>
          {showVision ? t.goalsScreen.hideVision : t.goalsScreen.showVision}
        </button>
        {showVision && (
          <TextField
            multiline
            rows={5}
            className="textarea"
            value={cycle.vision ?? ''}
            placeholder={t.goalsScreen.visionPlaceholder}
            onSave={(v) => save({ vision: v || null })}
          />
        )}
      </div>
    </div>
  )
}

// ---------- goal ----------

function GoalCard({ goal, index, tactics }: { goal: Goal; index: number; tactics: Tactic[] }) {
  const { t } = useI18n()
  const save = (changes: Partial<Goal>) => repo.updateGoal(goal.id, changes)
  const minTooHigh =
    goal.weekly_hours_minimum !== null && goal.weekly_hours_minimum > goal.weekly_hours_target

  const remove = () => {
    if (confirm(t.goalsScreen.confirmDeleteGoal(goal.name))) repo.deleteGoal(goal.id)
  }

  const addTactic = () =>
    repo.createTactic({ goal_id: goal.id, name: t.goalsScreen.newTactic, description: '', weekly_frequency: null })

  return (
    <div className="card stack">
      <div className="row">
        <TextField
          className="goal-name grow"
          ariaLabel={t.goalsScreen.goalName}
          value={goal.name}
          required
          onSave={(name) => save({ name })}
        />
        <button className="link danger" onClick={remove}>
          {t.goalsScreen.deleteGoal}
        </button>
      </div>
      <div className="row small-text">
        <span className="muted">{t.goalsScreen.color}</span>
        <ColorPicker
          value={goal.color ?? null}
          auto={goalColor(index)}
          label={t.goalsScreen.color}
          autoLabel={t.goalsScreen.autoColor}
          onChange={(color) => save({ color })}
        />
      </div>
      <TextField
        multiline
        rows={2}
        className="textarea"
        ariaLabel={t.goalsScreen.description}
        placeholder={t.goalsScreen.descriptionPlaceholder}
        value={goal.description}
        onSave={(description) => save({ description })}
      />
      <div className="row">
        <label className="field">
          <span>{t.common.targetHours}</span>
          <NumberField
            value={goal.weekly_hours_target}
            onChange={(v) => v !== null && v >= 0 && save({ weekly_hours_target: v })}
          />
        </label>
        <label className="field">
          <span>{t.common.minimumHours}</span>
          <NumberField
            value={goal.weekly_hours_minimum}
            placeholder="–"
            onChange={(v) => (v === null || v >= 0) && save({ weekly_hours_minimum: v })}
          />
        </label>
      </div>
      {minTooHigh && <p className="warn-box">{t.goalsScreen.minAboveTarget}</p>}

      <div>
        <h3>{t.goalsScreen.tactics}</h3>
        <div className="tactic-head muted">
          <span>{t.goalsScreen.name}</span>
          <span>{t.common.perWeek}</span>
          <span>{t.goalsScreen.active}</span>
          <span />
        </div>
        {tactics.map((x) => (
          <TacticRow key={x.id} tactic={x} />
        ))}
        {tactics.length === 0 && <p className="muted">{t.goalsScreen.noTactics}</p>}
        <button className="link" onClick={addTactic}>
          {t.setup.tactics.addTactic}
        </button>
      </div>
    </div>
  )
}

// ---------- tactic ----------

function TacticRow({ tactic }: { tactic: Tactic }) {
  const { t } = useI18n()
  const save = (changes: Partial<Tactic>) => repo.updateTactic(tactic.id, changes)
  const remove = () => {
    if (confirm(t.goalsScreen.confirmDeleteTactic(tactic.name))) repo.deleteTactic(tactic.id)
  }
  const scheduled = (tactic.schedule_days?.length ?? 0) > 0
  return (
    <>
    <div className={tactic.active ? 'tactic-row' : 'tactic-row inactive'}>
      <TextField ariaLabel={t.setup.tactics.name} value={tactic.name} required onSave={(name) => save({ name })} />
      <NumberField
        className="num small"
        ariaLabel={t.common.timesPerWeek}
        value={tactic.weekly_frequency}
        // With a schedule, times per week = number of days.
        disabled={scheduled}
        step={1}
        min={1}
        max={14}
        placeholder="–"
        onChange={(v) =>
          (v === null || (Number.isInteger(v) && v >= 1 && v <= 14)) && save({ weekly_frequency: v })
        }
      />
      <input
        type="checkbox"
        aria-label={t.goalsScreen.active}
        checked={tactic.active}
        onChange={(e) => save({ active: e.target.checked })}
      />
      <button className="link danger" aria-label={t.goalsScreen.deleteTactic(tactic.name)} onClick={remove}>
        ✕
      </button>
    </div>
    <div className="tactic-sched">
      <TextField
        ariaLabel={t.goalsScreen.minimum}
        className="minimum-field"
        placeholder={t.goalsScreen.minimumPlaceholder}
        value={tactic.minimum_version ?? ''}
        onSave={(v) => save({ minimum_version: v.trim() || null })}
      />
    </div>
    <TacticSchedule tactic={tactic} />
    </>
  )
}

// ---------- tactic schedule (days, time, duration) ----------

function TacticSchedule({ tactic }: { tactic: Tactic }) {
  const { t, locale } = useI18n()
  const s = t.goalsScreen.schedule
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<number[]>(tactic.schedule_days ?? [])
  const [time, setTime] = useState(tactic.schedule_time ?? '09:00')
  const [hours, setHours] = useState<number | null>(tactic.schedule_hours ?? 1)
  const [error, setError] = useState(false)
  // Any Monday–Sunday, to name the weekdays in the current language.
  const names = weekDates('2026-11-16').map((d) => formatWeekday(d, locale, 'short'))
  const current = tactic.schedule_days ?? []

  const save = async (clear = false) => {
    if (!clear && days.length === 0) return setError(true)
    await repo.setTacticSchedule(
      tactic.id,
      clear ? { days: [], time: null, hours: null } : { days, time: isValidTime(time) ? time : null, hours },
      todayISO(),
    )
    if (clear) setDays([])
    setOpen(false)
    setError(false)
  }

  if (!open) {
    return (
      <div className="tactic-sched">
        <button className="link small-text" onClick={() => setOpen(true)}>
          {current.length > 0
            ? s.summary(current.map((d) => names[d - 1]).join(' · '), tactic.schedule_time ?? '', tactic.schedule_hours ?? null)
            : s.add}
        </button>
      </div>
    )
  }
  return (
    <div className="tactic-sched open stack">
      <p className="muted small-text">{s.hint}</p>
      <div className="row">
        {names.map((name, i) => (
          <button
            key={name}
            type="button"
            className={days.includes(i + 1) ? 'chip on' : 'chip'}
            aria-pressed={days.includes(i + 1)}
            onClick={() => setDays((prev) => (prev.includes(i + 1) ? prev.filter((d) => d !== i + 1) : [...prev, i + 1].sort()))}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="row">
        <label className="field">
          <span>{s.time}</span>
          <input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="field">
          <span>{s.hours}</span>
          <NumberField className="num small" value={hours} placeholder="1" onChange={setHours} />
        </label>
      </div>
      {error && <p className="bad small-text">{s.needDay}</p>}
      <div className="row">
        <button className="btn primary" onClick={() => save()}>
          {t.common.save}
        </button>
        <button className="btn" onClick={() => setOpen(false)}>
          {t.common.cancel}
        </button>
        {current.length > 0 && (
          <button className="link danger" onClick={() => save(true)}>
            {s.remove}
          </button>
        )}
      </div>
    </div>
  )
}
