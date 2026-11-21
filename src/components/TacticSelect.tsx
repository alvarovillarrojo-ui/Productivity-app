// Dropdown to pick a tactic, grouped by goal. The empty choice is "Other"
// (not linked to any goal; doesn't count towards execution %).
import type { Goal, Tactic } from '../data/types'

interface Props {
  goals: Goal[]
  tactics: Tactic[]
  value: string | null
  onChange: (tacticId: string | null) => void
  id?: string
}

export default function TacticSelect({ goals, tactics, value, onChange, id }: Props) {
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      {goals.map((g) => {
        // Inactive tactics are hidden, except the one already selected.
        const options = tactics.filter((t) => t.goal_id === g.id && (t.active || t.id === value))
        if (options.length === 0) return null
        return (
          <optgroup key={g.id} label={g.name}>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
        )
      })}
      <option value="">Other (not counted)</option>
    </select>
  )
}

/** "Fitness › Run" label for a task's tactic, or "Other". */
export function tacticLabel(tacticId: string | null, goals: Goal[], tactics: Tactic[]): string {
  if (!tacticId) return 'Other'
  const tactic = tactics.find((t) => t.id === tacticId)
  const goal = tactic && goals.find((g) => g.id === tactic.goal_id)
  return tactic && goal ? `${goal.name} › ${tactic.name}` : 'Other'
}
