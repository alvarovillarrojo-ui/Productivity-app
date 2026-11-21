// Step b) Review last cycle — final numbers, then choose what to carry over.
import type { Cycle, Task } from '../../data/types'
import { useI18n } from '../../i18n'
import { bestAndWorstWeeks, cycleExecution, cycleTotals, formatPct } from '../../logic/metrics'
import { pctClass } from '../../components/pctClass'
import { todayISO } from '../../logic/weeks'
import type { PreviousCycle } from './draft'
import type { StepProps } from './stepProps'

interface Props extends StepProps {
  previous: PreviousCycle & { cycle: Cycle; tasks: Task[] }
}

export default function ReviewStep({ draft, change, previous }: Props) {
  const { t } = useI18n()
  const r = t.setup.review
  const { cycle, goals, tactics, tasks } = previous
  const weeks = cycleExecution(cycle, tasks, goals, tactics, todayISO())
  const totals = cycleTotals(weeks, goals)
  const bw = bestAndWorstWeeks(weeks)

  const toggle = (list: string[], id: string, on: boolean) =>
    on ? [...list, id] : list.filter((x) => x !== id)

  return (
    <div className="stack">
      <div className="card">
        <h2>{cycle.name}</h2>
        <p className="big-number">
          <span className={pctClass(totals.overall.pct)}>{formatPct(totals.overall.pct)}</span>
          <span className="muted"> {r.overall}</span>
        </p>
        <table className="table">
          <tbody>
            {goals.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td className={pctClass(totals.byGoal.get(g.id)!.pct)}>
                  {formatPct(totals.byGoal.get(g.id)!.pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bw ? (
          <p className="muted">
            {r.bestWorst(bw.best.week, formatPct(bw.best.overall.pct), bw.worst.week, formatPct(bw.worst.overall.pct))}
          </p>
        ) : (
          <p className="muted">{r.noTasks}</p>
        )}
        {cycle.status === 'active' && <p className="note">{r.willClose}</p>}
      </div>

      <div className="card">
        <h2>{r.carryTitle}</h2>
        <p className="muted">{r.carryHint}</p>
        {goals.length === 0 && <p className="muted">{r.noGoals}</p>}
        {goals.map((g) => {
          const goalOn = draft.carryGoalIds.includes(g.id)
          return (
            <div key={g.id} className="carry-goal">
              <label>
                <input
                  type="checkbox"
                  checked={goalOn}
                  onChange={(e) => change({ carryGoalIds: toggle(draft.carryGoalIds, g.id, e.target.checked) })}
                />{' '}
                <strong>{g.name}</strong>
              </label>
              <div className="carry-tactics">
                {tactics
                  .filter((x) => x.goal_id === g.id)
                  .map((x) => (
                    <label key={x.id} className={goalOn ? '' : 'disabled'}>
                      <input
                        type="checkbox"
                        disabled={!goalOn}
                        checked={goalOn && draft.carryTacticIds.includes(x.id)}
                        onChange={(e) =>
                          change({ carryTacticIds: toggle(draft.carryTacticIds, x.id, e.target.checked) })
                        }
                      />{' '}
                      {x.name}
                      {!x.active && <span className="muted"> {t.common.inactive}</span>}
                    </label>
                  ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
