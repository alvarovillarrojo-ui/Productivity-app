import { describe, expect, it } from 'vitest'
import type { AllData, Cycle, Goal, Habit, Tactic, Task } from '../data/types'
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
    expect(r.summary.execution.overall).toEqual({ pct: 50, done: 1, partial: 0, missed: 1, overdue: 0, upcoming: 0 })
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
  const habit: Habit = {
    id: 'h1', name: 'Read 10 pages', category: 'saw', identity: '', intention: '', stack: '', attractive: '',
    two_minute: 'Read 1 page', reward: '', days: [1, 2, 3, 4, 5], active: true, start_date: '2026-11-09',
    sort_order: 0, created_at: 'x', updated_at: 'x',
  }
  const data: AllData = {
    cycles: [cycle], goals, tactics, tasks: [task({ id: 'k1' })],
    habits: [habit], habit_checks: [{ id: 'h1|2026-11-10', habit_id: 'h1', date: '2026-11-10' }],
    events: [{
      id: 'e1', title: 'Corporate Finance', date: '2026-11-10', start_time: '09:00', end_time: '10:30',
      repeat_weekly: true, repeat_until: null, notes: '', category_id: 'cat1', created_at: 'x', updated_at: 'x',
    }],
    focus_sessions: [{
      id: 'f1', task_id: 'k1', task_title: 'Task', date: '2026-11-10', started_at: '2026-11-10T09:00:00.000Z',
      minutes: 25, completed: true,
    }],
    days: [{ date: '2026-11-10', must_do: 'k1', mode: 'planned', reflection: 'Good day', opened_at: 'x', closed_at: null }],
    subjects: [{ id: 's1', name: 'Corporate Finance', color: null, info: 'Prof. X', weekly_hours_target: 4, archived: false, sort_order: 0, created_at: 'x', updated_at: 'x' }],
    topics: [{ id: 'tp1', subject_id: 's1', name: 'WACC', status: 'progress', difficult: true, notes: 'Review betas', sort_order: 0 }],
    exams: [{ id: 'ex1', subject_id: 's1', kind: 'final', title: 'Final', date: '2027-01-14', start_time: '18:30', weight: 60, grade: null, notes: '', created_at: 'x', updated_at: 'x' },
      { id: 'ex2', subject_id: 's1', kind: 'group', title: 'Case', date: '2027-01-20', start_time: null, weight: 30, grade: null, notes: '', deliverables: [{ id: 'dl1', title: 'Presentation', date: '2027-01-10', start_time: '10:00' }], created_at: 'x', updated_at: 'x' }],
    categories: [{ id: 'cat1', name: 'Uni', color: '#2a78d6', sort_order: 0, fixed: 'uni' }, { id: 'cat2', name: 'Gym', color: '#008300', sort_order: 1 }],
    study_logs: [{ id: 'sl1', subject_id: 's1', topic_id: 'tp1', exam_id: null, date: '2026-11-20', hours: 1.5, note: 'Library', created_at: 'x' }],
    inbox: [{ id: 'in1', text: 'Call the bank', created_at: 'x' }],
    routines: [{ id: 'r1', title: 'Laundry', tactic_id: null, weekday: 7, start_time: '10:00', planned_hours: 1, active: true, created_at: 'x' }],
  }

  it('round-trips through JSON', () => {
    const file = JSON.parse(JSON.stringify(buildBackup(data, '2026-11-23T08:00:00Z')))
    const r = parseBackup(file)
    expect(r.issues).toEqual([])
    expect(r.data).toEqual(data)
    expect(r.exportedAt).toBe('2026-11-23T08:00:00Z')
  })

  it('restores v0.1 backups that have no habits yet', () => {
    const old = buildBackup(data, 'x') as unknown as { data: Record<string, unknown> }
    delete old.data.habits
    delete old.data.habit_checks
    delete old.data.events
    delete old.data.focus_sessions
    delete old.data.days
    delete old.data.subjects
    delete old.data.topics
    delete old.data.exams
    delete old.data.categories
    delete old.data.study_logs
    delete old.data.inbox
    delete old.data.routines
    const r = parseBackup(JSON.parse(JSON.stringify(old)))
    expect(r.issues).toEqual([])
    expect(r.data!.habits).toEqual([])
    expect(r.data!.habit_checks).toEqual([])
  })

  it('checks habit records and their ticks', () => {
    const badDays = buildBackup({ ...data, habits: [{ ...habit, days: [0, 8] }] }, 'x')
    expect(parseBackup(badDays).issues[0]).toEqual({ code: 'record', path: 'data.habits[0].days' })
    const orphan = buildBackup({ ...data, habit_checks: [{ id: 'z', habit_id: 'gone', date: '2026-11-10' }] }, 'x')
    expect(parseBackup(orphan).issues).toEqual([{ code: 'link', path: 'data.habit_checks[0].habit_id' }])
  })

  it('rejects a project date that is not a date', () => {
    const bad = buildBackup({ ...data, exams: [{ id: 'p', subject_id: 's1', kind: 'project', title: '', date: '2027-01-20', start_time: null, weight: null, grade: null, notes: '', created_at: 'x', updated_at: 'x', deliverables: [{ id: 'd', title: 'x', date: 'soon', start_time: null }] }] }, 'x')
    expect(parseBackup(bad).issues[0]).toEqual({ code: 'record', path: 'data.exams[0].deliverables' })
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

describe('examples/sample_import.json', () => {
  it('is a valid import file', async () => {
    const { readFileSync } = await import('node:fs')
    const json = JSON.parse(readFileSync(new URL('../../examples/sample_import.json', import.meta.url), 'utf8'))
    const r = parseImport(json, null)
    expect(r.issues).toEqual([])
    expect(r.plan!.newGoals.map((g) => g.name)).toEqual(['Fitness', 'Learning'])
    expect(r.plan!.tasks).toHaveLength(8)
  })

  it('imports into an active cycle that starts on any Monday', async () => {
    const { readFileSync } = await import('node:fs')
    const json = JSON.parse(readFileSync(new URL('../../examples/sample_import.json', import.meta.url), 'utf8'))
    const otherCycle = { ...cycle, start_date: '2027-03-01', length_weeks: 6 }
    const r = parseImport(json, { cycle: otherCycle, goals: [], tactics: [], tasks: [] })
    expect(r.issues).toEqual([])
    expect(r.plan!.cycleIgnored).toBe(true)
  })
})

describe('repeated tasks', () => {
  it('keeps two identical tasks from a file, but skips them once they exist', () => {
    const file = {
      schema_version: '1.0',
      tasks: [
        { week_number: 2, title: 'Study', goal: 'Grades', tactic: 'Study block' },
        { week_number: 2, title: 'Study', goal: 'Grades', tactic: 'Study block' },
      ],
    }
    expect(parseImport(file, target()).plan!.tasks).toHaveLength(2)
    const one = parseImport(file, target([task({ title: 'Study' })])).plan!
    expect([one.tasks.length, one.duplicates]).toEqual([1, 1])
    const both = parseImport(file, target([task({ title: 'Study' }), task({ title: 'Study' })])).plan!
    expect([both.tasks.length, both.duplicates]).toEqual([0, 2])
  })
})

describe('tactic schedules in files', () => {
  it('reads days, time and hours; days set the frequency', () => {
    const file = {
      schema_version: '1.0',
      cycle: { name: 'C', start_date: '2026-11-09' },
      goals: [{ name: 'Grades', weekly_hours_target: 20, tactics: [{ name: 'Study', weekly_frequency: 2, days: [5, 1, 3], time: '16:00', hours: 2 }] }],
    }
    const r = parseImport(file, null)
    expect(r.issues).toEqual([])
    expect(r.plan!.newGoals[0].tactics[0]).toMatchObject({ weekly_frequency: 3, schedule_days: [1, 3, 5], schedule_time: '16:00', schedule_hours: 2 })
  })

  it('reports bad days and times', () => {
    const file = {
      schema_version: '1.0',
      cycle: { name: 'C', start_date: '2026-11-09' },
      goals: [{ name: 'G', weekly_hours_target: 1, tactics: [{ name: 'A', days: [0, 8] }, { name: 'B', days: [1], time: '25:00' }] }],
    }
    expect(parseImport(file, null).issues.map((i) => `${i.code}@${i.path}`)).toEqual([
      'days@goals[0].tactics[0].days',
      'time@goals[0].tactics[1].time',
    ])
  })

  it('backups keep the schedule', () => {
    const scheduled = { ...tactics[0], schedule_days: [1, 3], schedule_time: '09:00', schedule_hours: 1.5 }
    const data = { cycles: [cycle], goals, tactics: [scheduled], tasks: [], habits: [], habit_checks: [], events: [], focus_sessions: [], days: [], subjects: [], topics: [], exams: [], categories: [], study_logs: [], inbox: [], routines: [] }
    const r = parseBackup(JSON.parse(JSON.stringify(buildBackup(data, 'x'))))
    expect(r.issues).toEqual([])
    expect(r.data!.tactics[0]).toEqual(scheduled)
  })
})

describe('pasting an answer from a chat', () => {
  it('finds the JSON inside a ```json block or between text', () => {
    const json = '{"schema_version": "1.0", "cycle": {"name": "C", "start_date": "2026-11-30"}}'
    expect(parseJson('Here is your plan:\n```json\n' + json + '\n```\nGood luck!').issues).toEqual([])
    expect(parseJson('Plan: ' + json + ' — enjoy').value).toMatchObject({ cycle: { name: 'C' } })
    expect(parseJson('no json at all').issues[0].code).toBe('invalidJson')
  })
})

describe('Plan with Claude prompt', () => {
  it('its example plan is a valid import file, and the prompt includes the answers', async () => {
    const { PROMPT_EXAMPLE, buildClaudePrompt } = await import('./claudePrompt')
    const r = parseImport(PROMPT_EXAMPLE, null)
    expect(r.issues).toEqual([])
    expect(r.plan!.newGoals[0].tactics[0]).toMatchObject({ schedule_days: [1, 3, 5], schedule_time: '16:00', weekly_frequency: 3 })
    const p = buildClaudePrompt({ start: '2027-01-11', goals: 'Pass CFA level 1', hours: 18, commitments: 'Classes Mon–Thu 9–14' }, 'es')
    expect(p).toContain('El ciclo empieza el 2027-01-11')
    expect(p).toContain('Pass CFA level 1')
    expect(p).toContain('"start_date": "2027-01-11"')
    expect(p).toContain('```json')
  })
})

describe('½, minimum versions and task times in files', () => {
  it('reads status "partial", a tactic "minimum" and a task "time"', () => {
    const file = {
      schema_version: '1.0',
      cycle: { name: 'C', start_date: '2026-11-09' },
      goals: [{ name: 'Fit', weekly_hours_target: 3, tactics: [{ name: 'Run', weekly_frequency: 3, minimum: '20 min easy' }] }],
      tasks: [
        { week_number: 2, title: 'Quiz', planned_date: '2026-11-16', time: '17:30' },
        { week_number: 1, title: 'Run', goal: 'Fit', tactic: 'Run', status: 'partial' },
        { week_number: 1, title: 'Bad', time: '5pm' },
      ],
    }
    const r = parseImport(file, null)
    expect(r.issues).toEqual([{ code: 'time', path: 'tasks[2].time', detail: '5pm' }])
    file.tasks.pop()
    const ok = parseImport(file, null).plan!
    expect(ok.newGoals[0].tactics[0].minimum_version).toBe('20 min easy')
    expect(ok.tasks.map((t) => [t.title, t.start_time, t.status])).toEqual([
      ['Quiz', '17:30', 'todo'],
      ['Run', null, 'partial'],
    ])
  })

  it('week reports export them and count ½ in the summary and Markdown', () => {
    const tacticWithMin = { ...tactics[0], minimum_version: '1 page' }
    const report = buildWeekReport({
      cycle, week: 2, goals, tactics: [tacticWithMin],
      weekTasks: [task({ title: 'A', status: 'done' }), task({ title: 'B', status: 'partial', start_time: '09:00', planned_date: '2026-11-17' })],
      today: '2026-11-25', includeVision: false, exportedAt: 'x',
    })
    expect(report.summary.execution.overall).toMatchObject({ done: 1, partial: 1, pct: 75 })
    expect(report.goals[0].tactics[0]).toMatchObject({ minimum: '1 page' })
    expect(report.tasks[1]).toMatchObject({ time: '09:00' })
    const md = weekReportMarkdown(report, en, (d) => d)
    expect(md).toContain('| **Overall** | 1.5 | 2 | **75%** |')
    expect(md).toContain('- [½] B _(Study block · 2026-11-17 09:00)_')
    // and the report can be imported again with its times
    expect(parseImport(JSON.parse(JSON.stringify(report)), null).plan!.tasks[1].start_time).toBe('09:00')
  })
})

describe('colours in backups', () => {
  it('keeps goal and event colours; rejects a bad colour', () => {
    const coloured = { ...goals[0], color: '#e34948' }
    const ev = { id: 'e1', title: 'Class', date: '2026-11-10', start_time: '09:00', end_time: '10:00', repeat_weekly: false, repeat_until: null, notes: '', color: '#0891b2', created_at: 'x', updated_at: 'x' }
    const data = { cycles: [cycle], goals: [coloured], tactics, tasks: [], habits: [], habit_checks: [], events: [ev], focus_sessions: [], days: [], subjects: [], topics: [], exams: [], categories: [], study_logs: [], inbox: [], routines: [] }
    const ok = parseBackup(JSON.parse(JSON.stringify(buildBackup(data, 'x'))))
    expect(ok.issues).toEqual([])
    expect(ok.data!.goals[0].color).toBe('#e34948')
    expect(ok.data!.events[0].color).toBe('#0891b2')
    const bad = buildBackup({ ...data, goals: [{ ...coloured, color: 'red' }] }, 'x')
    expect(parseBackup(bad).issues).toEqual([{ code: 'record', path: 'data.goals[0].color' }])
  })
})

describe('fail causes in files', () => {
  it('reads a task "cause" and rejects unknown ones', () => {
    const base = { schema_version: '1.0', cycle: { name: 'C', start_date: '2026-11-09' } }
    const ok = parseImport({ ...base, tasks: [{ week_number: 1, title: 'X', status: 'missed', cause: 'unforeseen' }] }, null)
    expect(ok.plan!.tasks[0].miss_reason).toBe('unforeseen')
    const bad = parseImport({ ...base, tasks: [{ week_number: 1, title: 'X', status: 'missed', cause: 'lazy' }] }, null)
    expect(bad.issues).toEqual([{ code: 'cause', path: 'tasks[0].cause', detail: 'lazy' }])
  })
})

describe('show on Home in backups', () => {
  it('keeps the tactic switch and rejects a non-boolean', () => {
    const shown = { ...tactics[0], show_on_home: true }
    const data = { cycles: [cycle], goals, tactics: [shown], tasks: [], habits: [], habit_checks: [], events: [], focus_sessions: [], days: [], subjects: [], topics: [], exams: [], categories: [], study_logs: [], inbox: [], routines: [] }
    const ok = parseBackup(JSON.parse(JSON.stringify(buildBackup(data, 'x'))))
    expect(ok.data!.tactics[0].show_on_home).toBe(true)
    const bad = buildBackup({ ...data, tactics: [{ ...shown, show_on_home: 'yes' as unknown as boolean }] }, 'x')
    expect(parseBackup(bad).issues).toEqual([{ code: 'record', path: 'data.tactics[0].show_on_home' }])
  })
})
