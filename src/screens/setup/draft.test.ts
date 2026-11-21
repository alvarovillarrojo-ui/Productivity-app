import { describe, expect, it } from 'vitest'
import type { Goal, Tactic } from '../../data/types'
import {
  applyCarryOver,
  blankGoal,
  createDraft,
  getSteps,
  goalWarnings,
  validateStep,
  type PreviousCycle,
} from './draft'

const goals: Goal[] = [
  { id: 'g1', cycle_id: 'c', name: 'Fitness', description: '', weekly_hours_target: 5, weekly_hours_minimum: 3, sort_order: 0 },
  { id: 'g2', cycle_id: 'c', name: 'Learning', description: '', weekly_hours_target: 4, weekly_hours_minimum: null, sort_order: 1 },
]
const tactics: Tactic[] = [
  { id: 't1', goal_id: 'g1', name: 'Run', description: '', active: true, weekly_frequency: 3, sort_order: 0 },
  { id: 't2', goal_id: 'g1', name: 'Gym', description: '', active: true, weekly_frequency: 2, sort_order: 1 },
  { id: 't3', goal_id: 'g2', name: 'Read', description: '', active: false, weekly_frequency: null, sort_order: 0 },
]
const previous: PreviousCycle = { id: 'c', vision: 'My vision', goals, tactics }

describe('wizard steps', () => {
  it('shows welcome only on first run and review only with a previous cycle', () => {
    expect(getSteps(true, false)).toEqual(['welcome', 'vision', 'cycle', 'goals', 'tactics', 'summary'])
    expect(getSteps(false, true)[0]).toBe('review')
  })

  it('starts a first-run draft on welcome with one blank goal', () => {
    const d = createDraft({ previous: null, cycleCount: 0, today: '2026-11-21' })
    expect(d.step).toBe('welcome')
    expect(d.startDate).toBe('2026-11-23')
    expect(d.goals).toHaveLength(1)
  })
})

describe('carry-over', () => {
  it('ticks all goals and active tactics by default and copies the vision', () => {
    const d = createDraft({ previous, cycleCount: 1, today: '2026-11-21' })
    expect(d.carryGoalIds).toEqual(['g1', 'g2'])
    expect(d.carryTacticIds).toEqual(['t1', 't2']) // t3 is inactive
    expect(d.vision).toBe('My vision')
    expect(d.cycleName).toBe('Cycle 2')
  })

  it('copies ticked goals and tactics', () => {
    const d = applyCarryOver(createDraft({ previous, cycleCount: 1, today: '2026-11-21' }), previous)
    expect(d.goals.map((g) => g.name)).toEqual(['Fitness', 'Learning'])
    expect(d.goals[0].tactics.map((t) => t.name)).toEqual(['Run', 'Gym'])
    expect(d.goals[0].weekly_hours_target).toBe(5)
  })

  it('updates correctly when going back and changing the ticks, keeping hand-made items', () => {
    let d = applyCarryOver(createDraft({ previous, cycleCount: 1, today: '2026-11-21' }), previous)
    // user adds their own goal and a tactic to Fitness
    d.goals.push({ ...blankGoal(), name: 'Career', weekly_hours_target: 2 })
    d.goals[0].tactics.push({ key: 'k', name: 'Swim', weekly_frequency: 1 })
    // then goes back and unticks Learning and Gym
    d = applyCarryOver({ ...d, carryGoalIds: ['g1'], carryTacticIds: ['t1'] }, previous)
    expect(d.goals.map((g) => g.name)).toEqual(['Fitness', 'Career'])
    expect(d.goals[0].tactics.map((t) => t.name)).toEqual(['Run', 'Swim'])
  })

  it('leaves one blank goal when nothing is carried', () => {
    const d = applyCarryOver(
      { ...createDraft({ previous, cycleCount: 1, today: '2026-11-21' }), carryGoalIds: [] },
      previous,
    )
    expect(d.goals).toHaveLength(1)
    expect(d.goals[0].name).toBe('')
  })
})

describe('validation', () => {
  const base = createDraft({ previous: null, cycleCount: 0, today: '2026-11-21' })

  it('requires a Monday start date', () => {
    expect(validateStep({ ...base, startDate: '2026-11-24' }, 'cycle')).toContain(
      'The start date must be a Monday.',
    )
    expect(validateStep(base, 'cycle')).toEqual([])
  })

  it('requires at least one named goal with a target', () => {
    expect(validateStep(base, 'goals')).toContain('Add at least one goal.')
    const ok = { ...base, goals: [{ ...blankGoal(), name: 'Fitness', weekly_hours_target: 5 }] }
    expect(validateStep(ok, 'goals')).toEqual([])
    const bad = { ...base, goals: [{ ...blankGoal(), name: 'Fitness', weekly_hours_target: 2, weekly_hours_minimum: 3 }] }
    expect(validateStep(bad, 'goals')[0]).toMatch(/minimum/)
  })

  it('warns (without blocking) above 3 goals', () => {
    const many = { ...base, goals: ['A', 'B', 'C', 'D'].map((name) => ({ ...blankGoal(), name, weekly_hours_target: 1 })) }
    expect(goalWarnings(many)).toHaveLength(1)
    expect(validateStep(many, 'goals')).toEqual([])
  })
})
