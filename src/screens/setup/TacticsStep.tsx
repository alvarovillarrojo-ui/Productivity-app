// Step f) Tactics — 2–4 per goal, each with an optional weekly frequency.
import NumberField from '../../components/NumberField'
import { useI18n } from '../../i18n'
import { blankTactic, filledGoals, tacticWarnings, type DraftGoal, type DraftTactic } from './draft'
import type { StepProps } from './stepProps'

export default function TacticsStep({ draft, change }: StepProps) {
  const { t } = useI18n()
  const tt = t.setup.tactics
  const setTactics = (goal: DraftGoal, tactics: DraftTactic[]) =>
    change({ goals: draft.goals.map((g) => (g.key === goal.key ? { ...g, tactics } : g)) })

  const updateTactic = (goal: DraftGoal, key: string, patch: Partial<DraftTactic>) =>
    setTactics(goal, goal.tactics.map((x) => (x.key === key ? { ...x, ...patch } : x)))

  return (
    <div className="stack">
      <p className="muted">{tt.hint}</p>
      {filledGoals(draft).map((goal) => (
        <div key={goal.key} className="card">
          <h2>{goal.name}</h2>
          {goal.tactics.map((x) => (
            <div key={x.key} className="row">
              <input
                className="grow"
                value={x.name}
                placeholder={tt.placeholder}
                aria-label={tt.name}
                onChange={(e) => updateTactic(goal, x.key, { name: e.target.value })}
              />
              <NumberField
                value={x.weekly_frequency}
                step={1}
                min={1}
                max={14}
                placeholder="–"
                ariaLabel={t.common.timesPerWeek}
                className="num small"
                onChange={(v) => updateTactic(goal, x.key, { weekly_frequency: v })}
              />
              <span className="muted">{t.common.perWeek}</span>
              <button
                className="link danger"
                aria-label={tt.remove}
                onClick={() => setTactics(goal, goal.tactics.filter((y) => y.key !== x.key))}
              >
                ✕
              </button>
            </div>
          ))}
          <button className="link" onClick={() => setTactics(goal, [...goal.tactics, blankTactic()])}>
            {tt.addTactic}
          </button>
        </div>
      ))}
      {tacticWarnings(draft).map((w, i) => (
        <p key={i} className="warn-box">
          {t.setup.issue(w)}
        </p>
      ))}
    </div>
  )
}
