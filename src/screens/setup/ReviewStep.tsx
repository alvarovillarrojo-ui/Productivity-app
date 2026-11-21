// Step b) Review last cycle — final numbers, then choose what to carry over.
import type { Cycle, Task } from '../../data/types'
import { bestAndWorstWeeks, cycleExecution, cycleTotals, formatPct } from '../../logic/metrics'
import { pctClass } from '../../components/pctClass'
import { todayISO } from '../../logic/weeks'
import type { PreviousCycle } from './draft'
import type { StepProps } from './stepProps'

interface Props extends StepProps {
  previous: PreviousCycle & { cycle: Cycle; tasks: Task[] }
}

export default function ReviewStep({ draft, change, previous }: Props) {
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
          <span className="muted"> overall execution</span>
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
            Best week: {bw.best.week} ({formatPct(bw.best.overall.pct)}) · Worst week: {bw.worst.week} (
            {formatPct(bw.worst.overall.pct)})
          </p>
        ) : (
          <p className="muted">No tracked tasks in this cycle.</p>
        )}
        {cycle.status === 'active' && (
          <p className="note">This cycle will be closed when you press “Start cycle” at the end.</p>
        )}
      </div>

      <div className="card">
        <h2>Carry over to the new cycle</h2>
        <p className="muted">Ticked goals and tactics are copied. You can still edit them in the next steps.</p>
        {goals.length === 0 && <p className="muted">The last cycle had no goals.</p>}
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
                  .filter((t) => t.goal_id === g.id)
                  .map((t) => (
                    <label key={t.id} className={goalOn ? '' : 'disabled'}>
                      <input
                        type="checkbox"
                        disabled={!goalOn}
                        checked={goalOn && draft.carryTacticIds.includes(t.id)}
                        onChange={(e) =>
                          change({ carryTacticIds: toggle(draft.carryTacticIds, t.id, e.target.checked) })
                        }
                      />{' '}
                      {t.name}
                      {!t.active && <span className="muted"> (inactive)</span>}
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
