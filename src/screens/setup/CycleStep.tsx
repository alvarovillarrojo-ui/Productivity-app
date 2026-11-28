// Step d) Cycle — name, start date (a Monday) and length.
import { addDays, cycleEnd, isMonday, isValidDate, mondayOf } from '../../logic/weeks'
import NumberField from '../../components/NumberField'
import { useI18n } from '../../i18n'
import type { StepProps } from './stepProps'
import { DateInput } from '../../components/DateTimeInput'

export default function CycleStep({ draft, change }: StepProps) {
  const { t, date } = useI18n()
  const c = t.setup.cycle
  const valid = isValidDate(draft.startDate)
  const monday = valid && isMonday(draft.startDate)
  // If a non-Monday is picked, offer the next Monday as a one-click fix.
  const suggestion = valid && !monday ? addDays(mondayOf(draft.startDate), 7) : null

  return (
    <div className="stack">
      <label className="field">
        <span>{c.name}</span>
        <input value={draft.cycleName} onChange={(e) => change({ cycleName: e.target.value })} />
      </label>
      <label className="field">
        <span>{c.startDate}</span>
        <DateInput value={draft.startDate} onChange={(v) => change({ startDate: v })} />
      </label>
      {suggestion && (
        <p className="warn-box">
          {c.mustBeMonday}{' '}
          <button className="link" onClick={() => change({ startDate: suggestion })}>
            {c.useDate(date(suggestion))}
          </button>
        </p>
      )}
      <label className="field">
        <span>{c.length}</span>
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
          {c.runs(date(draft.startDate), date(cycleEnd({ start_date: draft.startDate, length_weeks: draft.lengthWeeks })))}
          {draft.lengthWeeks !== 12 && c.not12}
        </p>
      )}
    </div>
  )
}
