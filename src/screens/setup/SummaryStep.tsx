// Step g) Summary — everything on one screen, with edit links.
import { useI18n } from '../../i18n'
import { cycleEnd, isValidDate } from '../../logic/weeks'
import { filledGoals, filledTactics, type StepId } from './draft'
import type { StepProps } from './stepProps'

interface Props extends StepProps {
  goTo: (step: StepId) => void
}

export default function SummaryStep({ draft, goTo }: Props) {
  const { t, date } = useI18n()
  const s = t.setup.summary
  const Edit = ({ step }: { step: StepId }) => (
    <button className="link" onClick={() => goTo(step)}>
      {t.common.edit}
    </button>
  )
  const dates = isValidDate(draft.startDate)
    ? `${date(draft.startDate)} → ${date(cycleEnd({ start_date: draft.startDate, length_weeks: draft.lengthWeeks }))}`
    : '–'

  return (
    <div className="stack">
      <div className="card">
        <div className="row spread">
          <h2>{s.cycle}</h2>
          <Edit step="cycle" />
        </div>
        <p>
          <strong>{draft.cycleName}</strong> · {s.weeks(draft.lengthWeeks)} · {dates}
        </p>
      </div>

      <div className="card">
        <div className="row spread">
          <h2>{s.vision}</h2>
          <Edit step="vision" />
        </div>
        <p className={draft.vision.trim() ? 'pre' : 'muted'}>{draft.vision.trim() || s.noVision}</p>
      </div>

      <div className="card">
        <div className="row spread">
          <h2>{s.goalsAndTactics}</h2>
          <span>
            <Edit step="goals" /> ·{' '}
            <button className="link" onClick={() => goTo('tactics')}>
              {s.editTactics}
            </button>
          </span>
        </div>
        {filledGoals(draft).map((g) => (
          <div key={g.key} className="summary-goal">
            <p>
              <strong>{g.name}</strong>{' '}
              <span className="muted">
                · {s.target(String(g.weekly_hours_target ?? '–'))}
                {g.weekly_hours_minimum !== null && ` · ${s.minimum(String(g.weekly_hours_minimum))}`}
              </span>
            </p>
            <ul>
              {filledTactics(g).map((x) => (
                <li key={x.key}>
                  {x.name}
                  {x.weekly_frequency !== null && (
                    <span className="muted">
                      {' '}
                      · {x.weekly_frequency}
                      {t.common.perWeek}
                    </span>
                  )}
                </li>
              ))}
              {filledTactics(g).length === 0 && <li className="muted">{s.noTactics}</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
