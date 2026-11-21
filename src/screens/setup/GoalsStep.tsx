// Step e) Goals — name and weekly hours (target and optional minimum).
import NumberField from '../../components/NumberField'
import { useI18n } from '../../i18n'
import { blankGoal, goalWarnings, type DraftGoal } from './draft'
import type { StepProps } from './stepProps'

export default function GoalsStep({ draft, change }: StepProps) {
  const { t } = useI18n()
  const g18 = t.setup.goals
  const update = (key: string, patch: Partial<DraftGoal>) =>
    change({ goals: draft.goals.map((g) => (g.key === key ? { ...g, ...patch } : g)) })
  const remove = (key: string) => change({ goals: draft.goals.filter((g) => g.key !== key) })

  return (
    <div className="stack">
      <p className="muted">{g18.recommend}</p>
      {goalWarnings(draft).map((w, i) => (
        <p key={i} className="warn-box">
          {t.setup.issue(w)}
        </p>
      ))}
      {draft.goals.map((g, i) => (
        <div key={g.key} className="card goal-card">
          <div className="row">
            <label className="field grow">
              <span>{g18.goalN(i + 1)}</span>
              <input
                value={g.name}
                placeholder={g18.placeholder}
                onChange={(e) => update(g.key, { name: e.target.value })}
              />
            </label>
            {draft.goals.length > 1 && (
              <button className="link danger" onClick={() => remove(g.key)} aria-label={g18.removeGoalN(i + 1)}>
                {t.common.remove}
              </button>
            )}
          </div>
          <div className="row">
            <label className="field">
              <span>{t.common.targetHours}</span>
              <NumberField value={g.weekly_hours_target} onChange={(v) => update(g.key, { weekly_hours_target: v })} />
            </label>
            <label className="field">
              <span>{t.common.minimumHoursOptional}</span>
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
        {g18.addGoal}
      </button>
    </div>
  )
}
