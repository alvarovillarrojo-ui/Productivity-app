// Step e) Goals — name and weekly hours (target and optional minimum).
import NumberField from '../../components/NumberField'
import { blankGoal, goalWarnings, type DraftGoal } from './draft'
import type { StepProps } from './stepProps'

export default function GoalsStep({ draft, change }: StepProps) {
  const update = (key: string, patch: Partial<DraftGoal>) =>
    change({ goals: draft.goals.map((g) => (g.key === key ? { ...g, ...patch } : g)) })
  const remove = (key: string) => change({ goals: draft.goals.filter((g) => g.key !== key) })

  return (
    <div className="stack">
      <p className="muted">We recommend 1–3 goals.</p>
      {goalWarnings(draft).map((w) => (
        <p key={w} className="warn-box">
          {w}
        </p>
      ))}
      {draft.goals.map((g, i) => (
        <div key={g.key} className="card goal-card">
          <div className="row">
            <label className="field grow">
              <span>Goal {i + 1}</span>
              <input
                value={g.name}
                placeholder="e.g. Fitness"
                onChange={(e) => update(g.key, { name: e.target.value })}
              />
            </label>
            {draft.goals.length > 1 && (
              <button className="link danger" onClick={() => remove(g.key)} aria-label={`Remove goal ${i + 1}`}>
                Remove
              </button>
            )}
          </div>
          <div className="row">
            <label className="field">
              <span>Target h/week</span>
              <NumberField value={g.weekly_hours_target} onChange={(v) => update(g.key, { weekly_hours_target: v })} />
            </label>
            <label className="field">
              <span>Minimum h/week (optional)</span>
              <NumberField
                value={g.weekly_hours_minimum}
                placeholder="–"
                onChange={(v) => update(g.key, { weekly_hours_minimum: v })}
              />
            </label>
          </div>
        </div>
      ))}
      <button className="btn" onClick={() => change({ goals: [...draft.goals, blankGoal()] })}>
        + Add goal
      </button>
    </div>
  )
}
