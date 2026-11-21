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
import { cycleEnd, isMonday, isValidDate } from '../logic/weeks'
import { MAX_RECOMMENDED_GOALS } from './setup/draft'

export default function GoalsScreen() {
  const { t } = useI18n()
  const cycle = useActiveCycle()
  const goals = useGoals(cycle?.id)
  const tactics = useTactics(cycle?.id)

  if (cycle === undefined) return null
  if (cycle === null) return <NoActiveCycle />

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

      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} tactics={tactics.filter((x) => x.goal_id === g.id)} />
      ))}

      <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={addGoal}>
        {t.setup.goals.addGoal}
      </button>
    </section>
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

function GoalCard({ goal, tactics }: { goal: Goal; tactics: Tactic[] }) {
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
  return (
    <div className={tactic.active ? 'tactic-row' : 'tactic-row inactive'}>
      <TextField ariaLabel={t.setup.tactics.name} value={tactic.name} required onSave={(name) => save({ name })} />
      <NumberField
        className="num small"
        ariaLabel={t.common.timesPerWeek}
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
        aria-label={t.goalsScreen.active}
        checked={tactic.active}
        onChange={(e) => save({ active: e.target.checked })}
      />
      <button className="link danger" aria-label={t.goalsScreen.deleteTactic(tactic.name)} onClick={remove}>
        ✕
      </button>
    </div>
  )
}
