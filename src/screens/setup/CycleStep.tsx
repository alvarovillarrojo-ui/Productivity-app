// Step d) Cycle — name, start date (a Monday) and length.
import { cycleEnd, formatShortDate, isMonday, isValidDate, mondayOf, addDays } from '../../logic/weeks'
import NumberField from '../../components/NumberField'
import type { StepProps } from './stepProps'

export default function CycleStep({ draft, change }: StepProps) {
  const valid = isValidDate(draft.startDate)
  const monday = valid && isMonday(draft.startDate)
  // If a non-Monday is picked, offer the next Monday as a one-click fix.
  const suggestion = valid && !monday ? addDays(mondayOf(draft.startDate), 7) : null

  return (
    <div className="stack">
      <label className="field">
        <span>Name</span>
        <input value={draft.cycleName} onChange={(e) => change({ cycleName: e.target.value })} />
      </label>
      <label className="field">
        <span>Start date (a Monday)</span>
        <input type="date" value={draft.startDate} onChange={(e) => change({ startDate: e.target.value })} />
      </label>
      {suggestion && (
        <p className="warn-box">
          Cycles start on a Monday.{' '}
          <button className="link" onClick={() => change({ startDate: suggestion })}>
            Use {formatShortDate(suggestion)}
          </button>
        </p>
      )}
      <label className="field">
        <span>Length in weeks</span>
        <NumberField
          value={draft.lengthWeeks}
          step={1}
          min={1}
          max={52}
          onChange={(v) => change({ lengthWeeks: v ?? 0 })}
        />
      </label>
      {monday && draft.lengthWeeks >= 1 && (
        <p className="muted">
          Runs from {formatShortDate(draft.startDate)} to{' '}
          {formatShortDate(cycleEnd({ start_date: draft.startDate, length_weeks: draft.lengthWeeks }))}.
          {draft.lengthWeeks !== 12 && ' (The method uses 12 weeks.)'}
        </p>
      )}
    </div>
  )
}
