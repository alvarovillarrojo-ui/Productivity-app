// The browser database (IndexedDB), set up with Dexie.
//
// Only `repo.ts` should import this file. The rest of the app talks to
// `repo.ts`, so storage can later be swapped (e.g. for a cloud database)
// without touching the screens.
import Dexie, { type EntityTable } from 'dexie'
import type { CalendarEvent, Cycle, EventCategory, InboxItem, Routine, StudyLog, DayEntry, Exam, FocusSession, Subject, Topic, Goal, Habit, HabitCheck, Tactic, Task } from './types'

/** One row of the settings table: a key and its value. */
export interface SettingRow {
  key: string
  value: unknown
}

export const DB_NAME = 'twelve-week-tracker'

export class TrackerDB extends Dexie {
  cycles!: EntityTable<Cycle, 'id'>
  goals!: EntityTable<Goal, 'id'>
  tactics!: EntityTable<Tactic, 'id'>
  tasks!: EntityTable<Task, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  habits!: EntityTable<Habit, 'id'>
  habit_checks!: EntityTable<HabitCheck, 'id'>
  events!: EntityTable<CalendarEvent, 'id'>
  focus_sessions!: EntityTable<FocusSession, 'id'>
  days!: EntityTable<DayEntry, 'date'>
  subjects!: EntityTable<Subject, 'id'>
  topics!: EntityTable<Topic, 'id'>
  exams!: EntityTable<Exam, 'id'>
  categories!: EntityTable<EventCategory, 'id'>
  study_logs!: EntityTable<StudyLog, 'id'>
  inbox!: EntityTable<InboxItem, 'id'>
  routines!: EntityTable<Routine, 'id'>

  constructor(name = DB_NAME) {
    super(name)
    // The strings list the fields we search by (indexes), not all fields.
    // The first one is the primary key. If the structure ever changes, add a
    // `this.version(2)` block below instead of editing this one.
    this.version(1).stores({
      cycles: 'id, status',
      goals: 'id, cycle_id',
      tactics: 'id, goal_id',
      tasks: 'id, cycle_id, [cycle_id+week_number], tactic_id',
      settings: 'key',
    })
    // v0.2: habits. Existing data is untouched; the new tables start empty.
    this.version(2).stores({
      habits: 'id',
      habit_checks: 'id, habit_id, date',
    })
    // v0.2: calendar events.
    this.version(3).stores({
      events: 'id, date',
    })
    // v0.2: pomodoro / focus sessions.
    this.version(4).stores({
      focus_sessions: 'id, date, task_id',
    })
    // v0.4: day journal (opening / closing).
    this.version(5).stores({
      days: 'date',
    })
    // v0.5: students (subjects, topics, exams); tasks can have a subject.
    this.version(6).stores({
      subjects: 'id',
      topics: 'id, subject_id',
      exams: 'id, subject_id, date',
      tasks: 'id, cycle_id, [cycle_id+week_number], tactic_id, subject_id',
    })
    // v0.6: named colour categories for calendar events.
    this.version(7).stores({
      categories: 'id',
    })
    // v0.6: study time logged by hand.
    this.version(8).stores({
      study_logs: 'id, subject_id, date',
    })
    // v9: the inbox (things jotted down to deal with later).
    this.version(9).stores({
      inbox: 'id, created_at',
    })
    // v10: tasks that repeat every week.
    this.version(10).stores({
      routines: 'id',
    })
  }
}

export const db = new TrackerDB()
