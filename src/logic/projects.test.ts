import { describe, expect, it } from 'vitest'
import type { Project, Task, TaskStatus } from '../data/types'
import { projectDeadlineEvents, projectIdOfEvent, projectProgress, sortProjects, stepWeek } from './projects'

const project = (over: Partial<Project>): Project => ({
  id: 'p', name: 'Move flat', notes: '', status: 'active', deadline: null, subject_id: null, exam_id: null, tactic_id: null,
  manual_progress: null, sort_order: 0, created_at: '', updated_at: '', ...over,
})
const step = (status: TaskStatus): Task => ({
  id: status, cycle_id: 'c', week_number: 1, title: 's', tactic_id: null, planned_date: null, planned_hours: null, actual_hours: null,
  status, miss_reason: null, notes: '', created_at: '', updated_at: '', project_id: 'p',
})

describe('project progress', () => {
  it('counts done steps (½ for partial) over all steps', () => {
    const p = projectProgress(project({}), [step('done'), step('partial'), step('todo'), step('missed')])
    expect(p).toMatchObject({ done: 1, partial: 1, total: 4, auto: 0.375, value: 0.375, manual: false })
  })
  it('your own % wins, and no steps means no automatic %', () => {
    expect(projectProgress(project({ manual_progress: 60 }), [step('todo')])).toMatchObject({ auto: 0, value: 0.6, manual: true })
    expect(projectProgress(project({}), [])).toMatchObject({ auto: null, value: null })
    expect(projectProgress(project({ manual_progress: 130 }), []).value).toBe(1)
  })
})

describe('project deadline', () => {
  it('is a deadline event for open projects only', () => {
    const evs = projectDeadlineEvents([project({ deadline: '2027-01-15' }), project({ id: 'q', deadline: '2027-01-20', status: 'done' }), project({ id: 'r' })])
    expect(evs.map((e) => [e.id, e.title, e.date, e.kind])).toEqual([['project:p', '📁 Move flat', '2027-01-15', 'deadline']])
    expect(projectIdOfEvent('project:p')).toBe('p')
    expect(projectIdOfEvent('exam:x')).toBeNull()
  })
})

describe('steps and weeks', () => {
  const cycle = { start_date: '2026-11-23', length_weeks: 12 }
  it('a step goes into the week of its date, or this week', () => {
    expect(stepWeek(cycle, '2026-12-08', '2026-11-28')).toBe(3)
    expect(stepWeek(cycle, null, '2026-11-28')).toBe(1)
    expect(stepWeek(cycle, '2027-06-01', '2026-11-28')).toBeNull() // outside the cycle
    expect(stepWeek(cycle, null, '2026-11-01')).toBe(1) // before the cycle starts
  })
  it('lists open projects first, by closest deadline', () => {
    const list = sortProjects([project({ id: 'a', name: 'B', status: 'done', deadline: '2026-01-01' }), project({ id: 'b', name: 'Z' }), project({ id: 'c', name: 'A', deadline: '2027-02-01' })])
    expect(list.map((p) => p.id)).toEqual(['c', 'b', 'a'])
  })
})
