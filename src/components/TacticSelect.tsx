// Dropdown to pick a tactic, grouped by goal. The empty choice is "Other"
// (not linked to any goal; doesn't count towards execution %).
import type { Goal, Tactic } from '../data/types'
import { useI18n } from '../i18n'

interface Props {
  goals: Goal[]
  tactics: Tactic[]
  value: string | null
  onChange: (tacticId: string | null) => void
  id?: string
}

export default function TacticSelect({ goals, tactics, value, onChange, id }: Props) {
  const { t } = useI18n()
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      {goals.map((g) => {
        // Inactive tactics are hidden, except the one already selected.
        const options = tactics.filter((x) => x.goal_id === g.id && (x.active || x.id === value))
        if (options.length === 0) return null
        return (
          <optgroup key={g.id} label={g.name}>
            {options.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </optgroup>
        )
      })}
      <option value="">{t.tasks.otherNotCounted}</option>
    </select>
  )
}

/** "Fitness › Run" label for a task's tactic, or `otherLabel` ("Other"). */
/** The minimum version of a task's tactic, or null. */
export function minimumOf(tacticId: string | null, tactics: Tactic[]): string | null {
  return (tacticId && tactics.find((t) => t.id === tacticId)?.minimum_version) || null
}

export function tacticLabel(
  tacticId: string | null,
  goals: Goal[],
  tactics: Tactic[],
  otherLabel: string,
): string {
  if (!tacticId) return otherLabel
  const tactic = tactics.find((t) => t.id === tacticId)
  const goal = tactic && goals.find((g) => g.id === tactic.goal_id)
  return tactic && goal ? `${goal.name} › ${tactic.name}` : otherLabel
}
