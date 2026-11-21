// Goals screen: edit the active cycle, its goals and their tactics.
// Every field saves by itself when you leave it (no Save button).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useCycleTasks, useGoals, useTactics } from '../data/hooks'
import type { Cycle, Goal, Tactic } from '../data/types'
import NumberField from '../components/NumberField'
import TextField from '../components/TextField'
import NoActiveCycle from '../components/NoActiveCycle'
import { cycleEnd, formatShortDate, isMonday, isValidDate } from '../logic/weeks'
import { MAX_RECOMMENDED_GOALS } from './setup/draft'

export default function GoalsScreen() {
  const cycle = useActiveCycle()
  const goals = useGoals(cycle?.id)
  const tactics = useTactics(cycle?.id)

  if (cycle === undefined) return null
  if (cycle === null) return <NoActiveCycle />

  const addGoal = () =>
    repo.createGoal({
      cycle_id: cycle.id,
      name: `New goal`,
      description: '',
      weekly_hours_target: 0,
      weekly_hours_minimum: null,
    })

  return (
    <section className="stack">
      <div className="row spread">
        <h1>Goals</h1>
        <Link className="btn" to="/setup">
          Start new cycle
        </Link>
      </div>

      <CycleCard cycle={cycle} />

      {goals.length > MAX_RECOMMENDED_GOALS && (
        <p className="warn-box">
          You have {goals.length} goals. Fewer goals usually means better execution. Consider keeping 1–3.
        </p>
      )}

      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} tactics={tactics.filter((t) => t.goal_id === g.id)} />
      ))}

      <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={addGoal}>
        + Add goal
      </button>
    </section>
  )
}

// ---------- cycle ----------

function CycleCard({ cycle }: { cycle: Cycle }) {
  const tasks = useCycleTasks(cycle.id)
  const [showVision, setShowVision] = useState(false)
  const [dateError, setDateError] = useState('')
  const save = (changes: Partial<Cycle>) => repo.updateCycle(cycle.id, changes)

  const changeStart = (date: string) => {
    if (!isValidDate(date)) return
    if (!isMonday(date)) return setDateError('The start date must be a Monday.')
    setDateError('')
    if (
      tasks.length > 0 &&
      !confirm(
        'Tasks keep their week number, so they will move to different dates. Change the start date anyway?',
      )
    )
      return
    save({ start_date: date })
  }

  return (
    <div className="card stack">
      <div className="row">
        <label className="field grow">
          <span>Cycle name</span>
          <TextField value={cycle.name} required onSave={(name) => save({ name })} />
        </label>
        <label className="field">
          <span>Start (Monday)</span>
          <input type="date" value={cycle.start_date} onChange={(e) => changeStart(e.target.value)} />
        </label>
        <label className="field">
          <span>Weeks</span>
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
        {formatShortDate(cycle.start_date)} → {formatShortDate(cycleEnd(cycle))}
      </p>
      <label className="field">
        <span>Notes</span>
        <TextField multiline rows={2} value={cycle.notes} onSave={(notes) => save({ notes })} />
      </label>
      <div>
        <button className="link" onClick={() => setShowVision(!showVision)}>
          {showVision ? 'Hide vision' : 'Show vision'}
        </button>
        {showVision && (
          <TextField
            multiline
            rows={5}
            className="textarea"
            value={cycle.vision ?? ''}
            placeholder="Your long-term vision (private, stays on this device)"
            onSave={(v) => save({ vision: v || null })}
          />
        )}
      </div>
    </div>
  )
}

// ---------- goal ----------

function GoalCard({ goal, tactics }: { goal: Goal; tactics: Tactic[] }) {
  const save = (changes: Partial<Goal>) => repo.updateGoal(goal.id, changes)
  const minTooHigh =
    goal.weekly_hours_minimum !== null && goal.weekly_hours_minimum > goal.weekly_hours_target

  const remove = () => {
    if (confirm(`Delete goal "${goal.name}" and its tactics? Its tasks are kept as "Other".`))
      repo.deleteGoal(goal.id)
  }

  const addTactic = () =>
    repo.createTactic({ goal_id: goal.id, name: 'New tactic', description: '', weekly_frequency: null })

  return (
    <div className="card stack">
      <div className="row">
        <TextField
          className="goal-name grow"
          ariaLabel="Goal name"
          value={goal.name}
          required
          onSave={(name) => save({ name })}
        />
        <button className="link danger" onClick={remove}>
          Delete goal
        </button>
      </div>
      <TextField
        multiline
        rows={2}
        className="textarea"
        ariaLabel="Goal description"
        placeholder="Description (optional): what does success look like?"
        value={goal.description}
        onSave={(description) => save({ description })}
      />
      <div className="row">
        <label className="field">
          <span>Target h/week</span>
          <NumberField
            value={goal.weekly_hours_target}
            onChange={(v) => v !== null && v >= 0 && save({ weekly_hours_target: v })}
          />
        </label>
        <label className="field">
          <span>Minimum h/week</span>
          <NumberField
            value={goal.weekly_hours_minimum}
            placeholder="–"
            onChange={(v) => (v === null || v >= 0) && save({ weekly_hours_minimum: v })}
          />
        </label>
      </div>
      {minTooHigh && <p className="warn-box">The minimum is higher than the target.</p>}

      <div>
        <h3>Tactics</h3>
        <div className="tactic-head muted">
          <span>Name</span>
          <span>× / week</span>
          <span>Active</span>
          <span />
        </div>
        {tactics.map((t) => (
          <TacticRow key={t.id} tactic={t} />
        ))}
        {tactics.length === 0 && <p className="muted">No tactics yet.</p>}
        <button className="link" onClick={addTactic}>
          + Add tactic
        </button>
      </div>
    </div>
  )
}

// ---------- tactic ----------

function TacticRow({ tactic }: { tactic: Tactic }) {
  const save = (changes: Partial<Tactic>) => repo.updateTactic(tactic.id, changes)
  const remove = () => {
    if (confirm(`Delete tactic "${tactic.name}"? Its tasks are kept as "Other". (Tip: untick "Active" to just hide it.)`))
      repo.deleteTactic(tactic.id)
  }
  return (
    <div className={tactic.active ? 'tactic-row' : 'tactic-row inactive'}>
      <TextField ariaLabel="Tactic name" value={tactic.name} required onSave={(name) => save({ name })} />
      <NumberField
        className="num small"
        ariaLabel="Times per week"
        value={tactic.weekly_frequency}
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
        aria-label="Active"
        checked={tactic.active}
        onChange={(e) => save({ active: e.target.checked })}
      />
      <button className="link danger" aria-label={`Delete tactic ${tactic.name}`} onClick={remove}>
        ✕
      </button>
    </div>
  )
}
