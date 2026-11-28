import { describe, expect, it } from 'vitest'
import type { Exam, Subject, Topic } from '../data/types'
import { parseBackup, parseImport, parseJson } from './exchange'
import { parseSubjectsFile, planCounts, planSubjectsImport } from './subjectsImport'
import { buildSubjectsPrompt, SUBJECTS_EXAMPLE } from './subjectsPrompt'

const file = (subjects: unknown[]) => ({ format: '12wt-subjects', version: '1.0', subjects })

describe('subjects file', () => {
  it('the example in the instructions is a valid file', () => {
    const r = parseSubjectsFile(SUBJECTS_EXAMPLE)
    expect(r.issues).toEqual([])
    const [s] = r.subjects!
    expect(s.topics.map((t) => t.name)).toEqual(['1. Time value of money', '2. Cost of capital (WACC)', '3. Capital structure'])
    expect(s.exams[1]).toMatchObject({ kind: 'group', deliverables: [{ title: 'Company choice' }, { title: 'Presentation', time: '09:00' }] })
  })
  it('reads the JSON even inside a ```json block pasted from the chat', () => {
    const pasted = `Here you go:\n\`\`\`json\n${JSON.stringify(SUBJECTS_EXAMPLE)}\n\`\`\`\nSave it as a file.`
    expect(parseSubjectsFile(parseJson(pasted).value).issues).toEqual([])
  })
  it('the instructions exist in both languages and include the example', () => {
    for (const lang of ['en', 'es'] as const) {
      const p = buildSubjectsPrompt(lang, '2026-11-28')
      expect(p).toContain('2026-11-28')
      expect(p).toContain('"format": "12wt-subjects"')
    }
  })
  it('reads the version as "version", "schema_version" or "schemaVersion" (or none)', () => {
    const { version: _v, ...noVersion } = SUBJECTS_EXAMPLE
    for (const extra of [{}, { schema_version: '1.0' }, { schemaVersion: '1.0' }, { version: 1 }]) {
      expect(parseSubjectsFile({ ...noVersion, ...extra }).issues).toEqual([])
    }
    expect(parseSubjectsFile({ ...noVersion, schemaVersion: '3.0' }).issues).toEqual([{ code: 'version', detail: '3.0' }])
  })
  it('accepts decimal or empty weights, empty times, past dates and mixed topics', () => {
    const r = parseSubjectsFile(
      file([{ name: 'Econometría', topics: ['1. Intro', { name: '2. MCO', notes: 'supuestos' }], exams: [
        { kind: 'quiz', title: 'Quiz 1', date: '2026-10-07', time: null, weight: 7.5 },
        { kind: 'other', title: 'Participación', date: '2026-11-02', weight: null },
      ] }]),
    )
    expect(r.issues).toEqual([])
    expect(r.subjects![0].exams.map((e) => e.weight)).toEqual([7.5, null])
  })
  it('a subjects file is never read as a plan or a backup', () => {
    expect(parseImport(SUBJECTS_EXAMPLE, null).issues).toEqual([{ code: 'subjectsFile' }])
    expect(parseBackup(SUBJECTS_EXAMPLE).issues).toEqual([{ code: 'subjectsFile' }])
  })
  it('explains what is wrong', () => {
    expect(parseSubjectsFile({ schema_version: '1.0', goals: [] }).issues).toEqual([{ code: 'notSubjects' }])
    expect(parseSubjectsFile({ ...file([]), version: '2' }).issues[0].code).toBe('version')
    expect(parseSubjectsFile(file([])).issues).toEqual([{ code: 'notSubjects' }])
    const bad = parseSubjectsFile(
      file([
        { name: '', exams: [{ kind: 'exam', date: '10/03/2027', time: '9am', weight: 130 }] },
        { name: 'Macro' },
        { name: 'macro' },
      ]),
    )
    expect(bad.issues.map((i) => [i.code, i.path])).toEqual([
      ['required', 'subjects[0].name'],
      ['examKind', 'subjects[0].exams[0].kind'],
      ['date', 'subjects[0].exams[0].date'],
      ['time', 'subjects[0].exams[0].time'],
      ['number', 'subjects[0].exams[0].weight'],
      ['duplicateName', 'subjects[2].name'],
    ])
  })
})

describe('only adds what is new', () => {
  const subject: Subject = { id: 's1', name: 'Corporate Finance', color: null, info: 'mine', weekly_hours_target: 5, archived: false, sort_order: 0, created_at: '', updated_at: '' }
  const topic: Topic = { id: 't1', subject_id: 's1', name: '2. Cost of capital (WACC)', status: 'mastered', difficult: false, notes: '', sort_order: 0 }
  const exam: Exam = { id: 'e1', subject_id: 's1', kind: 'midterm', title: 'midterm', date: '2027-03-11', start_time: null, weight: 30, grade: 8, notes: '', created_at: '', updated_at: '' }

  it('keeps existing subjects, topics and exams untouched and adds the rest', () => {
    const { subjects } = parseSubjectsFile({ ...SUBJECTS_EXAMPLE, subjects: [...SUBJECTS_EXAMPLE.subjects, { name: 'Macro', topics: ['IS-LM', 'IS-LM'] }] })
    const plan = planSubjectsImport(subjects!, { subjects: [subject], topics: [topic], exams: [exam] })
    expect(plan.newSubjects.map((s) => s.name)).toEqual(['Macro'])
    expect(plan.newSubjects[0].topics.map((t) => t.name)).toEqual(['IS-LM'])
    expect(plan.additions).toHaveLength(1)
    expect(plan.additions[0].subject.id).toBe('s1')
    expect(plan.additions[0].topics.map((t) => t.name)).toEqual(['1. Time value of money', '3. Capital structure'])
    expect(plan.additions[0].exams.map((e) => e.title)).toEqual(['Valuation project', 'Final exam'])
    expect(plan.skipped).toBe(3) // WACC, the midterm, and the repeated IS-LM
    expect(planCounts(plan)).toEqual({ subjects: 1, topics: 3, exams: 2 })
  })
  it('importing the same file again adds nothing', () => {
    const { subjects } = parseSubjectsFile(file([{ name: 'Macro', topics: ['IS-LM'], exams: [{ kind: 'quiz', date: '2027-02-01' }] }]))
    const macro = { ...subject, id: 'm', name: 'macro' }
    const plan = planSubjectsImport(subjects!, {
      subjects: [macro],
      topics: [{ ...topic, subject_id: 'm', name: 'is-lm' }],
      exams: [{ ...exam, subject_id: 'm', kind: 'quiz', title: '', date: '2027-02-01' }],
    })
    expect(plan.newSubjects).toEqual([])
    expect(plan.additions).toEqual([])
    expect(plan.skipped).toBe(2)
  })
})
