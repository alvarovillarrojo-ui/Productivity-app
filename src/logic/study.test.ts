import { describe, expect, it } from 'vitest'
import type { Exam, FocusSession, Subject, Task, Topic } from '../data/types'
import { difficultTopics, examEvents, examIdOfEvent, nextExam, overallAverage, studyHours, subjectGrades, topicProgress } from './study'

const exam = (over: Partial<Exam>): Exam => ({
  id: Math.random().toString(), subject_id: 's', kind: 'final', title: '', date: '2027-01-14', start_time: null,
  weight: null, grade: null, notes: '', created_at: '', updated_at: '', ...over,
})

describe('grades', () => {
  it('weighted average over graded exams', () => {
    // quiz 20% → 8, midterm 30% → 9, final 50% not yet
    const g = subjectGrades([exam({ weight: 20, grade: 8 }), exam({ weight: 30, grade: 9 }), exam({ weight: 50 })])
    expect(g.average).toBeCloseTo(8.6)
    expect(g).toMatchObject({ gradedWeight: 50, totalWeight: 100 })
  })
  it('simple average when there are no weights; null when nothing graded', () => {
    expect(subjectGrades([exam({ grade: 7 }), exam({ grade: 9 })]).average).toBe(8)
    expect(subjectGrades([exam({ weight: 40 })]).average).toBeNull()
  })
  it('overall average = mean of subjects that have grades', () => {
    expect(overallAverage([8, 9, null])).toBe(8.5)
    expect(overallAverage([null])).toBeNull()
  })
})

describe('study hours', () => {
  const task = (over: Partial<Task>): Task => ({
    id: Math.random().toString(), cycle_id: 'c', week_number: 3, title: '', tactic_id: null, planned_date: null,
    planned_hours: null, actual_hours: null, status: 'done', miss_reason: null, notes: '', created_at: '', updated_at: '', ...over,
  })
  const session = (over: Partial<FocusSession>): FocusSession => ({
    id: Math.random().toString(), task_id: null, task_title: '', date: '2026-11-24', started_at: '', minutes: 25, completed: true, ...over,
  })
  it('adds task hours and free pomodoros of the subject; pomodoros on a task are not counted twice', () => {
    const tasks = [task({ subject_id: 'cf', actual_hours: 2 }), task({ subject_id: 'cf', actual_hours: 1, week_number: 2 }), task({ subject_id: 'macro', actual_hours: 5 })]
    const sessions = [session({ subject_id: 'cf', minutes: 30 }), session({ task_id: 'x', subject_id: 'cf' }), session({ subject_id: 'macro' })]
    expect(studyHours('cf', tasks, sessions)).toBe(3.5)
    expect(studyHours('cf', tasks, sessions, { task: (t) => t.week_number === 3, session: (s) => s.date >= '2026-11-23' })).toBe(2.5)
  })
})

describe('exams and topics', () => {
  it('finds the next exam with days left', () => {
    const r = nextExam([exam({ id: 'a', date: '2027-01-14' }), exam({ id: 'b', date: '2026-12-03' }), exam({ id: 'old', date: '2026-11-01' })], '2026-11-24')
    expect([r!.exam.id, r!.daysLeft]).toEqual(['b', 9])
  })
  it('lists difficult topics not yet mastered, and progress', () => {
    const topic = (over: Partial<Topic>): Topic => ({ id: Math.random().toString(), subject_id: 's', name: 'x', status: 'todo', difficult: false, notes: '', sort_order: 0, ...over })
    const topics = [topic({ name: 'WACC', difficult: true }), topic({ name: 'APV', difficult: true, status: 'mastered' }), topic({ status: 'mastered' }), topic({})]
    expect(difficultTopics(topics).map((t) => t.name)).toEqual(['WACC'])
    expect(topicProgress(topics)).toBe(0.5)
  })
  it('turns exams into one-off calendar events', () => {
    const subject: Subject = { id: 's', name: 'Corporate Finance', color: '#e34948', info: '', weekly_hours_target: null, archived: false, sort_order: 0, created_at: '', updated_at: '' }
    const [ev] = examEvents([exam({ id: 'e1', title: '', start_time: '18:30' })], [subject], () => 'Final', (s) => s.color!)
    expect(ev).toMatchObject({ id: 'exam:e1', title: 'Corporate Finance · Final', start_time: '18:30', end_time: '19:30', repeat_weekly: false, color: '#e34948' })
  })
})

describe('projects with several dates', () => {
  const subject: Subject = { id: 's', name: 'Strategy', color: '#2a78d6', info: '', weekly_hours_target: null, archived: false, sort_order: 0, created_at: '', updated_at: '' }
  const group = exam({
    id: 'g1', kind: 'group', title: '', date: '2026-12-15',
    deliverables: [
      { id: 'd1', title: 'Report', date: '2026-12-01', start_time: '23:00' },
      { id: 'd2', title: 'Presentation', date: '2026-12-10', start_time: null },
    ],
  })
  it('the next date can be a deliverable', () => {
    const r = nextExam([group, exam({ id: 'f', date: '2026-12-20' })], '2026-12-02')
    expect([r!.exam.id, r!.deliverable?.title, r!.daysLeft]).toEqual(['g1', 'Presentation', 8])
  })
  it('each deliverable is its own calendar event, linked back to the project', () => {
    const evs = examEvents([group], [subject], () => 'Group work', (s) => s.color!)
    expect(evs.map((e) => [e.id, e.title, e.date])).toEqual([
      ['exam:g1:d1', 'Strategy · Group work — Report', '2026-12-01'],
      ['exam:g1:d2', 'Strategy · Group work — Presentation', '2026-12-10'],
      ['exam:g1', 'Strategy · Group work', '2026-12-15'],
    ])
    expect(evs.every((e) => e.kind === 'deadline')).toBe(true)
    expect(evs.map((e) => examIdOfEvent(e.id))).toEqual(['g1', 'g1', 'g1'])
    expect(examIdOfEvent('abc')).toBeNull()
  })
})
