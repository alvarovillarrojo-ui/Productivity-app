import { describe, expect, it } from 'vitest'
import type { AllData, Cycle, Goal, Tactic, Task } from '../data/types'
import { en } from '../i18n/en'
import {
  backupFileName,
  buildBackup,
  buildWeekReport,
  parseBackup,
  parseImport,
  parseJson,
  weekReportFileName,
  weekReportMarkdown,
  type ImportTarget,
} from './exchange'

// Cycle starting Monday 9 Nov 2026; week 2 = 16–22 Nov.
const cycle: Cycle = {
  id: 'c1', name: 'Autumn', start_date: '2026-11-09', length_weeks: 12, status: 'active',
  vision: 'My secret vision', notes: '', created_at: 'x', updated_at: 'x',
}
const goals: Goal[] = [
  { id: 'g1', cycle_id: 'c1', name: 'Grades', description: '', weekly_hours_target: 20, weekly_hours_minimum: 10, sort_order: 0 },
]
const tactics: Tactic[] = [
  { id: 't1', goal_id: 'g1', name: 'Study block', description: '', active: true, weekly_frequency: 5, sort_order: 0 },
]
const task = (over: Partial<Task>): Task => ({
  id: Math.random().toString(), cycle_id: 'c1', week_number: 2, title: 'Task', tactic_id: 't1',
  planned_date: null, planned_hours: null, actual_hours: null, status: 'todo', miss_reason: null,
  notes: '', created_at: 'x', updated_at: 'x', ...over,
})
const target = (tasks: Task[] = []): ImportTarget => ({ cycle, goals, tactics, tasks })

const minimalFile = {
  schema_version: '1.0',
  cycle: { name: 'New', start_date: '2026-11-09', length_weeks: 12 },
  goals: [
    { name: 'Fitness', weekly_hours_target: 3, weekly_hours_minimum: 2, tactics: [{ name: 'Run', weekly_frequency: 3 }] },
  ],
  tasks: [{ week_number: 1, title: 'Run 5 km', goal: 'Fitness', tactic: 'Run', status: 'done', actual_hours: 0.5 }],
}

const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code)

describe('parseImport', () => {
  it('plans a new cycle when there is no active one', () => {
    const r = parseImport(minimalFile, null)
    expect(r.issues).toEqual([])
    expect(r.plan!.cycle).toEqual({
      kind: 'new',
      data: { name: 'New', start_date: '2026-11-09', length_weeks: 12, vision: null, notes: '' },
    })
    expect(r.plan!.newGoals[0].tactics[0]).toEqual({ name: 'Run', description: '', active: true, weekly_frequency: 3 })
    expect(r.plan!.tasks[0]).toMatchObject({ title: 'Run 5 km', goal: 'Fitness', tactic: 'Run', status: 'done', actual_hours: 0.5 })
  })

  it('needs a cycle in the file when nothing is active', () => {
    const { cycle: _, ...noCycle } = minimalFile
    expect(codes(parseImport(noCycle, null))).toContain('missingCycle')
  })

  it('rejects other schema versions and non-objects', () => {
    expect(codes(parseImport({ ...minimalFile, schema_version: '2.0' }, null))).toEqual(['version'])
    expect(codes(parseImport([], null))).toEqual(['notObject'])
    expect(codes(parseJson('{ nope'))).toEqual(['invalidJson'])
  })

  it('reports each problem with its place in the file', () => {
    const bad = {
      schema_version: '1.0',
      cycle: { name: '', start_date: '2026-11-10', length_weeks: 60 },
      goals: [
        { name: 'A', weekly_hours_target: 2, weekly_hours_minimum: 5, tactics: [{ name: 'X', weekly_frequency: 20 }] },
        { name: 'a', weekly_hours_target: -1 },
      ],
      tasks: [
        { week_number: 99, title: 'T1' },
        { week_number: 1, title: 'T2', tactic: 'X' },
        { week_number: 1, title: 'T3', goal: 'A', tactic: 'Nope' },
        { week_number: 1, title: 'T4', status: 'later' },
        { week_number: 1, title: 'T5', planned_date: '2026-12-01' },
      ],
    }
    const issues = parseImport(bad, null).issues
    const got = issues.map((i) => `${i.code}@${i.path ?? ''}`)
    expect(got).toEqual(
      expect.arrayContaining([
        'required@cycle.name',
        'monday@cycle.start_date',
        'length@cycle.length_weeks',
        'minAboveTarget@goals[0]',
        'frequency@goals[0].tactics[0].weekly_frequency',
        'number@goals[1].weekly_hours_target',
        'duplicateName@goals[1].name',
        'week@tasks[0].week_number',
        'tacticNeedsGoal@tasks[1]',
        'unknownTactic@tasks[2]',
        'status@tasks[3].status',
        'dateOutsideWeek@tasks[4].planned_date',
      ]),
    )
    expect(parseImport(bad, null).plan).toBeNull()
  })

  it('adds into the active cycle, reusing goals and tactics by name', () => {
    const file = {
      schema_version: '1.0',
      cycle: { name: 'Ignored', start_date: '2026-01-05', length_weeks: 12 },
      goals: [
        { name: ' grades ', weekly_hours_target: 1, tactics: [{ name: 'STUDY BLOCK' }, { name: 'Past papers' }] },
        { name: 'Fitness', weekly_hours_target: 3, tactics: [{ name: 'Run' }] },
      ],
      tasks: [
        { week_number: 2, title: 'Chapter 1', goal: 'Grades', tactic: 'Study block' },
        { week_number: 2, title: 'Exam 2024', goal: 'Grades', tactic: 'Past papers' },
        { week_number: 2, title: 'Groceries' },
      ],
    }
    const r = parseImport(file, target([task({ title: 'chapter 1' })]))
    expect(r.issues).toEqual([])
    const plan = r.plan!
    expect(plan.cycle).toEqual({ kind: 'existing', id: 'c1', name: 'Autumn' })
    expect(plan.cycleIgnored).toBe(true)
    expect(plan.newGoals.map((g) => g.name)).toEqual(['Fitness'])
    expect(plan.newTactics).toEqual([{ goal: 'Grades', tactic: expect.objectContaining({ name: 'Past papers' }) }])
    // "Chapter 1" already exists (case-insensitive) → skipped.
    expect(plan.duplicates).toBe(1)
    expect(plan.tasks.map((x) => [x.title, x.goal, x.tactic])).toEqual([
      ['Exam 2024', 'Grades', 'Past papers'],
      ['Groceries', null, null],
    ])
  })

  it('uses the target cycle length for week numbers', () => {
    const file = { schema_version: '1.0', tasks: [{ week_number: 13, title: 'Too late' }] }
    expect(codes(parseImport(file, target()))).toEqual(['week'])
  })
})

describe('week report', () => {
  const weekTasks = [
    task({ title: 'Read ch. 3', status: 'done', planned_hours: 2, actual_hours: 2, planned_date: '2026-11-17' }),
    task({ title: 'Read ch. 4', status: 'missed' }),
    task({ title: 'Groceries', tactic_id: null, status: 'done', actual_hours: 1 }),
  ]
  const build = (includeVision: boolean) =>
    buildWeekReport({
      cycle, week: 2, goals, tactics, weekTasks, today: '2026-11-25', includeVision, exportedAt: '2026-11-25T10:00:00Z',
    })

  it('summarises the week and leaves out the vision by default', () => {
    const r = build(false)
    expect(r.week_start).toBe('2026-11-16')
    expect(r.week_end).toBe('2026-11-22')
    expect(r.summary.execution.overall).toEqual({ pct: 50, done: 1, missed: 1, overdue: 0, upcoming: 0 })
    expect(r.summary.hours[0]).toMatchObject({ goal: 'Grades', actual: 2, level: 'below' })
    expect(r.summary.other_hours).toBe(1)
    expect('vision' in r.cycle).toBe(false)
    expect(JSON.stringify(r)).not.toContain('secret')
    expect(build(true).cycle.vision).toBe('My secret vision')
  })

  it('can be imported again (round trip)', () => {
    const json = JSON.parse(JSON.stringify(build(false)))
    const r = parseImport(json, null)
    expect(r.issues).toEqual([])
    expect(r.plan!.newGoals.map((g) => g.name)).toEqual(['Grades'])
    expect(r.plan!.tasks.map((x) => [x.title, x.tactic, x.status])).toEqual([
      ['Read ch. 3', 'Study block', 'done'],
      ['Read ch. 4', 'Study block', 'missed'],
      ['Groceries', null, 'done'],
    ])
    // Importing it into the same cycle again adds nothing.
    const again = parseImport(json, target(weekTasks))
    expect(again.plan!.tasks).toEqual([])
    expect(again.plan!.duplicates).toBe(3)
  })

  it('renders a Markdown report', () => {
    const md = weekReportMarkdown(build(false), en, (d) => d)
    expect(md).toContain('# Autumn — Week 2 of 12')
    expect(md).toContain('| **Overall** | 1 | 2 | **50%** |')
    expect(md).toContain('- [x] Read ch. 3 _(Study block · 2026-11-17 · 2 h)_')
    expect(md).toContain('- [✗] Read ch. 4')
    expect(md).toContain('### Other')
    expect(md).not.toContain('Vision')
  })

  it('names files so git ignores them', () => {
    expect(weekReportFileName(3, 'json')).toBe('week_03_report.json')
    expect(weekReportFileName(12, 'md')).toBe('week_12_report.md')
    expect(backupFileName('2026-11-23')).toBe('12wt-backup-2026-11-23.json')
  })
})

describe('backup', () => {
  const data: AllData = { cycles: [cycle], goals, tactics, tasks: [task({ id: 'k1' })] }

  it('round-trips through JSON', () => {
    const file = JSON.parse(JSON.stringify(buildBackup(data, '2026-11-23T08:00:00Z')))
    const r = parseBackup(file)
    expect(r.issues).toEqual([])
    expect(r.data).toEqual(data)
    expect(r.exportedAt).toBe('2026-11-23T08:00:00Z')
  })

  it('refuses import files and broken backups', () => {
    expect(codes(parseBackup(minimalFile))).toEqual(['notBackup'])
    const broken = buildBackup({ ...data, tasks: [task({ id: 'k1', tactic_id: 'missing' })] }, 'x')
    expect(parseBackup(broken).issues).toEqual([{ code: 'link', path: 'data.tasks[0].tactic_id' }])
    const twoActive = buildBackup({ ...data, cycles: [cycle, { ...cycle, id: 'c2' }] }, 'x')
    expect(codes(parseBackup(twoActive))).toEqual(['manyActive'])
    const badRecord = buildBackup({ ...data, goals: [{ ...goals[0], weekly_hours_target: 'lots' as unknown as number }] }, 'x')
    expect(parseBackup(badRecord).issues[0]).toEqual({ code: 'record', path: 'data.goals[0].weekly_hours_target' })
  })
})
