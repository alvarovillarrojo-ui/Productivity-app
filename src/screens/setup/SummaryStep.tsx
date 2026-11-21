// Step g) Summary — everything on one screen, with edit links.
import { cycleEnd, formatShortDate, isValidDate } from '../../logic/weeks'
import { filledGoals, filledTactics, type StepId } from './draft'
import type { StepProps } from './stepProps'

interface Props extends StepProps {
  goTo: (step: StepId) => void
}

export default function SummaryStep({ draft, goTo }: Props) {
  const Edit = ({ step }: { step: StepId }) => (
    <button className="link" onClick={() => goTo(step)}>
      Edit
    </button>
  )
  const dates = isValidDate(draft.startDate)
    ? `${formatShortDate(draft.startDate)} → ${formatShortDate(
        cycleEnd({ start_date: draft.startDate, length_weeks: draft.lengthWeeks }),
      )}`
    : '–'

  return (
    <div className="stack">
      <div className="card">
        <div className="row spread">
          <h2>Cycle</h2>
          <Edit step="cycle" />
        </div>
        <p>
          <strong>{draft.cycleName}</strong> · {draft.lengthWeeks} weeks · {dates}
        </p>
      </div>

      <div className="card">
        <div className="row spread">
          <h2>Vision</h2>
          <Edit step="vision" />
        </div>
        <p className={draft.vision.trim() ? 'pre' : 'muted'}>{draft.vision.trim() || 'No vision written.'}</p>
      </div>

      <div className="card">
        <div className="row spread">
          <h2>Goals and tactics</h2>
          <span>
            <Edit step="goals" /> · <button className="link" onClick={() => goTo('tactics')}>Edit tactics</button>
          </span>
        </div>
        {filledGoals(draft).map((g) => (
          <div key={g.key} className="summary-goal">
            <p>
              <strong>{g.name}</strong>{' '}
              <span className="muted">
                · target {g.weekly_hours_target ?? '–'} h/week
                {g.weekly_hours_minimum !== null && ` · minimum ${g.weekly_hours_minimum} h`}
              </span>
            </p>
            <ul>
              {filledTactics(g).map((t) => (
                <li key={t.key}>
                  {t.name}
                  {t.weekly_frequency !== null && <span className="muted"> · {t.weekly_frequency}× / week</span>}
                </li>
              ))}
              {filledTactics(g).length === 0 && <li className="muted">No tactics</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
