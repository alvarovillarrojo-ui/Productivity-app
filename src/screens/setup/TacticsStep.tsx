// Step f) Tactics — 2–4 per goal, each with an optional weekly frequency.
import NumberField from '../../components/NumberField'
import { blankTactic, filledGoals, tacticWarnings, type DraftGoal, type DraftTactic } from './draft'
import type { StepProps } from './stepProps'

export default function TacticsStep({ draft, change }: StepProps) {
  const setTactics = (goal: DraftGoal, tactics: DraftTactic[]) =>
    change({ goals: draft.goals.map((g) => (g.key === goal.key ? { ...g, tactics } : g)) })

  const updateTactic = (goal: DraftGoal, key: string, patch: Partial<DraftTactic>) =>
    setTactics(goal, goal.tactics.map((t) => (t.key === key ? { ...t, ...patch } : t)))

  return (
    <div className="stack">
      <p className="muted">
        2–4 tactics per goal works best. “Times per week” is optional: with it, the Tasks screen can
        create that many tasks each week for you.
      </p>
      {filledGoals(draft).map((goal) => (
        <div key={goal.key} className="card">
          <h2>{goal.name}</h2>
          {goal.tactics.map((t) => (
            <div key={t.key} className="row">
              <input
                className="grow"
                value={t.name}
                placeholder="e.g. Run 5 km"
                aria-label="Tactic name"
                onChange={(e) => updateTactic(goal, t.key, { name: e.target.value })}
              />
              <NumberField
                value={t.weekly_frequency}
                step={1}
                min={1}
                max={14}
                placeholder="–"
                ariaLabel="Times per week"
                className="num small"
                onChange={(v) => updateTactic(goal, t.key, { weekly_frequency: v })}
              />
              <span className="muted">× / week</span>
              <button
                className="link danger"
                aria-label="Remove tactic"
                onClick={() => setTactics(goal, goal.tactics.filter((x) => x.key !== t.key))}
              >
                ✕
              </button>
            </div>
          ))}
          <button className="link" onClick={() => setTactics(goal, [...goal.tactics, blankTactic()])}>
            + Add tactic
          </button>
        </div>
      ))}
      {tacticWarnings(draft).map((w) => (
        <p key={w} className="warn-box">
          {w}
        </p>
      ))}
    </div>
  )
}
