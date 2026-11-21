// The setup wizard's unfinished work ("draft") and the rules for it.
//
// The draft is saved to the device after every change, so closing the browser
// mid-wizard loses nothing. Nothing is written to the real cycles/goals
// tables until "Start cycle" is pressed.
import type { Goal, Tactic } from '../../data/types'
import { isMonday, isValidDate, nextMonday } from '../../logic/weeks'

export type StepId = 'welcome' | 'review' | 'vision' | 'cycle' | 'goals' | 'tactics' | 'summary'

export interface DraftTactic {
  key: string // temporary id, only used inside the wizard
  name: string
  weekly_frequency: number | null
  /** Set when carried over from the previous cycle. */
  fromTacticId?: string
}

export interface DraftGoal {
  key: string
  name: string
  description: string
  weekly_hours_target: number | null
  weekly_hours_minimum: number | null
  tactics: DraftTactic[]
  /** Set when carried over from the previous cycle. */
  fromGoalId?: string
}

export interface WizardDraft {
  version: 1
  step: StepId
  /** The cycle being reviewed and closed (null on first run). */
  previousCycleId: string | null
  /** Previous goals/tactics ticked "carry over". */
  carryGoalIds: string[]
  carryTacticIds: string[]
  vision: string
  cycleName: string
  startDate: string
  lengthWeeks: number
  goals: DraftGoal[]
}

/** Recommended maximum number of goals per cycle. */
export const MAX_RECOMMENDED_GOALS = 3

const key = () => crypto.randomUUID()

export function blankTactic(): DraftTactic {
  return { key: key(), name: '', weekly_frequency: null }
}

export function blankGoal(): DraftGoal {
  return {
    key: key(),
    name: '',
    description: '',
    weekly_hours_target: null,
    weekly_hours_minimum: null,
    tactics: [blankTactic(), blankTactic()],
  }
}

/** Which steps to show. */
export function getSteps(isFirstRun: boolean, hasPrevious: boolean): StepId[] {
  const steps: StepId[] = []
  if (isFirstRun) steps.push('welcome')
  if (hasPrevious) steps.push('review')
  steps.push('vision', 'cycle', 'goals', 'tactics', 'summary')
  return steps
}

/** The previous cycle's data, used for review and carry-over. */
export interface PreviousCycle {
  id: string
  vision: string | null
  goals: Goal[]
  tactics: Tactic[]
}

export function createDraft(opts: {
  previous: PreviousCycle | null
  cycleCount: number
  today: string
  /** Default name in the user's language, e.g. (n) => `Cycle ${n}`. */
  cycleName?: (n: number) => string
}): WizardDraft {
  const { previous } = opts
  return {
    version: 1,
    step: opts.cycleCount === 0 ? 'welcome' : previous ? 'review' : 'vision',
    previousCycleId: previous?.id ?? null,
    // By default everything from the previous cycle is ticked to carry over.
    carryGoalIds: previous?.goals.map((g) => g.id) ?? [],
    carryTacticIds: previous?.tactics.filter((t) => t.active).map((t) => t.id) ?? [],
    vision: previous?.vision ?? '',
    cycleName: (opts.cycleName ?? ((n: number) => `Cycle ${n}`))(opts.cycleCount + 1),
    startDate: nextMonday(opts.today),
    lengthWeeks: 12,
    goals: previous ? [] : [blankGoal()],
  }
}

/** Is this goal still completely empty (nothing typed)? */
function isBlankGoal(g: DraftGoal): boolean {
  return !g.fromGoalId && g.name.trim() === '' && g.tactics.every((t) => t.name.trim() === '')
}

/**
 * Applies the carry-over ticks to the draft's goals. Safe to run again after
 * going back: goals typed by hand are kept, carried goals/tactics are added
 * or removed to match the ticks.
 */
export function applyCarryOver(draft: WizardDraft, previous: PreviousCycle): WizardDraft {
  const goalIds = new Set(draft.carryGoalIds)
  const tacticIds = new Set(draft.carryTacticIds)

  // 1. Keep hand-made goals (except empty ones) and still-ticked carried goals.
  const goals: DraftGoal[] = draft.goals
    .filter((g) => !isBlankGoal(g))
    .filter((g) => !g.fromGoalId || goalIds.has(g.fromGoalId))
    .map((g) => {
      if (!g.fromGoalId) return g
      // Within a carried goal: keep hand-made tactics and ticked carried ones,
      // then add newly ticked tactics.
      const kept = g.tactics.filter((t) => !t.fromTacticId || tacticIds.has(t.fromTacticId))
      const present = new Set(kept.map((t) => t.fromTacticId))
      const added = previous.tactics
        .filter((t) => t.goal_id === g.fromGoalId && tacticIds.has(t.id) && !present.has(t.id))
        .map(tacticFrom)
      return { ...g, tactics: [...kept, ...added] }
    })

  // 2. Add newly ticked goals.
  const present = new Set(goals.map((g) => g.fromGoalId))
  for (const pg of previous.goals) {
    if (!goalIds.has(pg.id) || present.has(pg.id)) continue
    goals.push({
      key: key(),
      name: pg.name,
      description: pg.description,
      weekly_hours_target: pg.weekly_hours_target,
      weekly_hours_minimum: pg.weekly_hours_minimum,
      fromGoalId: pg.id,
      tactics: previous.tactics
        .filter((t) => t.goal_id === pg.id && tacticIds.has(t.id))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(tacticFrom),
    })
  }

  return { ...draft, goals: goals.length > 0 ? goals : [blankGoal()] }
}

function tacticFrom(t: Tactic): DraftTactic {
  return { key: key(), name: t.name, weekly_frequency: t.weekly_frequency, fromTacticId: t.id }
}

/** Goals the user actually filled in (blank rows are ignored). */
export function filledGoals(draft: WizardDraft): DraftGoal[] {
  return draft.goals.filter((g) => !isBlankGoal(g))
}

/** Tactics the user actually filled in. */
export function filledTactics(goal: DraftGoal): DraftTactic[] {
  return goal.tactics.filter((t) => t.name.trim() !== '')
}

/**
 * A problem or hint found in the draft. It is a CODE plus details, not text:
 * the screen turns it into English or Spanish (see `setup.issue` in i18n).
 */
export interface DraftIssue {
  code:
    | 'cycleName'
    | 'startDate'
    | 'notMonday'
    | 'length'
    | 'noGoals'
    | 'goalName'
    | 'goalTarget'
    | 'minAboveTarget'
    | 'frequency'
    | 'tooManyGoals'
    | 'noTactics'
  /** Goal name (empty if not typed yet). */
  goal?: string
  /** Goal position (0-based), used when the goal has no name yet. */
  index?: number
  tactic?: string
  count?: number
}

/** Problems that block moving on from a step. Empty list = OK. */
export function validateStep(draft: WizardDraft, step: StepId): DraftIssue[] {
  const errors: DraftIssue[] = []
  if (step === 'cycle' || step === 'summary') {
    if (draft.cycleName.trim() === '') errors.push({ code: 'cycleName' })
    if (!isValidDate(draft.startDate)) errors.push({ code: 'startDate' })
    else if (!isMonday(draft.startDate)) errors.push({ code: 'notMonday' })
    if (!Number.isInteger(draft.lengthWeeks) || draft.lengthWeeks < 1 || draft.lengthWeeks > 52)
      errors.push({ code: 'length' })
  }
  if (step === 'goals' || step === 'summary') {
    const goals = filledGoals(draft)
    if (goals.length === 0) errors.push({ code: 'noGoals' })
    for (const [index, g] of goals.entries()) {
      const goal = g.name.trim()
      if (goal === '') errors.push({ code: 'goalName', goal, index })
      if (g.weekly_hours_target === null || g.weekly_hours_target < 0)
        errors.push({ code: 'goalTarget', goal, index })
      if (
        g.weekly_hours_minimum !== null &&
        g.weekly_hours_target !== null &&
        g.weekly_hours_minimum > g.weekly_hours_target
      )
        errors.push({ code: 'minAboveTarget', goal, index })
    }
  }
  if (step === 'tactics' || step === 'summary') {
    for (const g of filledGoals(draft)) {
      for (const t of filledTactics(g)) {
        const f = t.weekly_frequency
        if (f !== null && (!Number.isInteger(f) || f < 1 || f > 14))
          errors.push({ code: 'frequency', goal: g.name, tactic: t.name })
      }
    }
  }
  return errors
}

/** Gentle (non-blocking) hint when there are too many goals. */
export function goalWarnings(draft: WizardDraft): DraftIssue[] {
  const count = filledGoals(draft).length
  return count > MAX_RECOMMENDED_GOALS ? [{ code: 'tooManyGoals', count }] : []
}

/** Gentle hint for goals without any tactic. */
export function tacticWarnings(draft: WizardDraft): DraftIssue[] {
  return filledGoals(draft)
    .filter((g) => filledTactics(g).length === 0)
    .map((g) => ({ code: 'noTactics', goal: g.name }))
}
