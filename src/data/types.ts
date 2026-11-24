// The shapes of everything the app stores.
import type { FocusSettings, FocusState } from '../logic/focus'
//
// Conventions used everywhere:
// - `id` values are random text UUIDs (e.g. "3f2b…"). Text ids never clash when
//   data is imported or restored, and they will work with a cloud database later.
// - Calendar dates are plain text "YYYY-MM-DD" in local time (e.g. "2026-11-09").
//   No time zone, so a task never slips to the previous day.
// - Timestamps (`created_at`, `updated_at`) are full ISO strings with time.

/** A calendar date as text: "YYYY-MM-DD". */
export type ISODate = string

export type CycleStatus = 'planning' | 'active' | 'closed'
/**
 * todo = not done yet · done = done (counts 1) · partial = only the minimum
 * version was done (counts ½) · missed = not done (counts 0).
 */
export type TaskStatus = 'todo' | 'done' | 'partial' | 'missed'

/** Why a task failed (✗): Planning · Unforeseen · Energy · Meaning (P/I/E/S). */
export const MISS_CAUSES = ['planning', 'unforeseen', 'energy', 'meaning'] as const
export type MissCause = (typeof MISS_CAUSES)[number]

/** A 12-week period (or another length) with its own goals. */
export interface Cycle {
  id: string
  name: string
  /** Always a Monday. Week 1 starts on this date. */
  start_date: ISODate
  /** Number of weeks, normally 12. */
  length_weeks: number
  status: CycleStatus
  /** Private long-term vision. Never exported unless the user asks. */
  vision: string | null
  notes: string
  /**
   * How many recurring tasks were created automatically, per "week|tacticId"
   * (see logic/taskActions.ts). Missing in data from v0.1 = nothing yet.
   */
  recurring_generated?: Record<string, number>
  created_at: string
  updated_at: string
}

/** Something you want to achieve in a cycle, e.g. "Fitness". */
export interface Goal {
  id: string
  cycle_id: string
  name: string
  description: string
  /** Hours per week you aim for. */
  weekly_hours_target: number
  /** Hours per week that still count as "acceptable". Optional. */
  weekly_hours_minimum: number | null
  /** Display order (0, 1, 2…). */
  sort_order: number
  /** Colour in the calendar and charts ("#2a78d6"); missing = automatic by order. */
  color?: string | null
}

/** A repeatable action that moves a goal forward, e.g. "Run 3x per week". */
export interface Tactic {
  id: string
  goal_id: string
  name: string
  description: string
  /** Inactive tactics stay in history but are hidden from new tasks. */
  active: boolean
  /** How many times per week, e.g. 3. Null = no fixed frequency. */
  weekly_frequency: number | null
  /**
   * Optional schedule (v0.2): the weekdays (1 = Mon … 7 = Sun) its tasks go
   * on, at `schedule_time` ("HH:MM") for `schedule_hours` hours. With a
   * schedule, times per week = number of days, and the weekly tasks appear
   * in the calendar on their own.
   */
  schedule_days?: number[] | null
  schedule_time?: string | null
  schedule_hours?: number | null
  /** The minimum version, e.g. "20 min easy". Doing only this counts ½. */
  minimum_version?: string | null
  /** Show this tactic's open blocks on Home → "Still open this week" (e.g. runs). */
  show_on_home?: boolean
  /** Display order (0, 1, 2…). */
  sort_order: number
}

/** One item on a weekly to-do list. */
export interface Task {
  id: string
  cycle_id: string
  /** 1 to cycle.length_weeks. */
  week_number: number
  title: string
  /** Null = "Other": shown, but not counted in execution %. */
  tactic_id: string | null
  planned_date: ISODate | null
  /** Start time "HH:MM" in the calendar (v0.2). Missing/null = not placed at a time. */
  start_time?: string | null
  planned_hours: number | null
  actual_hours: number | null
  status: TaskStatus
  /** For a missed task: why (a MissCause), or null if not given. */
  miss_reason: string | null
  /** The subject studied in this task (Students tab), if any. */
  subject_id?: string | null
  /**
   * block = a session of the plan, created automatically from a tactic: it
   * lives in the calendar and is marked in the night closing.
   * todo = something you have to do (tasks you add). See logic/taskActions.
   */
  kind?: 'block' | 'todo'
  notes: string
  created_at: string
  updated_at: string
}

/**
 * The 7 habits of highly effective people (Stephen Covey), used as habit
 * categories. "saw" = Sharpen the saw (body, mind, heart, spirit).
 */
export const HABIT_CATEGORIES = [
  'proactive',
  'end_in_mind',
  'first_things',
  'win_win',
  'understand',
  'synergize',
  'saw',
] as const
export type HabitCategory = (typeof HABIT_CATEGORIES)[number]

/**
 * A habit you want to build, set up the "Atomic Habits" way (James Clear).
 * Habits don't belong to a cycle: they continue from one cycle to the next.
 * Only `name`, `category` and `days` are required; the rest are prompts.
 */
export interface Habit {
  id: string
  name: string
  category: HabitCategory
  /** Identity: "I am someone who…" */
  identity: string
  /** Law 1, make it obvious: "I will [habit] at [time] in [place]". */
  intention: string
  /** Law 1, habit stacking: "After [current habit], I will [new habit]". */
  stack: string
  /** Law 2, make it attractive: something you enjoy paired with it. */
  attractive: string
  /** Law 3, make it easy: the 2-minute version. */
  two_minute: string
  /** Law 4, make it satisfying: the reward. */
  reward: string
  /** Weekdays it is planned on: 1 = Monday … 7 = Sunday. */
  days: number[]
  /** Paused habits are hidden from Home and not scored. */
  active: boolean
  /** First day it counts (no misses before this). */
  start_date: ISODate
  sort_order: number
  created_at: string
  updated_at: string
}

/** "Done" mark for a habit on one day. Id is "habitId|date" (one per day). */
export interface HabitCheck {
  id: string
  habit_id: string
  date: ISODate
}

export const EVENT_KINDS = ['class', 'deadline', 'other'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

/**
 * Something in the calendar that isn't a task: a class, an exam, a meeting.
 * No times = all day. A weekly event repeats every week on the same weekday
 * (until `repeat_until`, or forever).
 */
export interface CalendarEvent {
  id: string
  title: string
  date: ISODate
  /** "HH:MM", or null for an all-day event. */
  start_time: string | null
  end_time: string | null
  repeat_weekly: boolean
  repeat_until: ISODate | null
  notes: string
  /** Id from an imported .ics file, so importing it again updates instead of duplicating. */
  ics_uid?: string | null
  /** Colour in the calendar ("#0891b2"); missing = grey. */
  color?: string | null
  /**
   * What it is: a class, a deadline (exam, deliverable…) or other. Only
   * deadlines appear in the deadlines radar. Missing = other.
   */
  kind?: EventKind

  created_at: string
  updated_at: string
}

/** One focus (pomodoro) session, finished or stopped early. */
export interface FocusSession {
  id: string
  /** The task worked on (null = free focus). */
  task_id: string | null
  /** Kept so the log still reads well if the task is deleted. */
  task_title: string
  date: ISODate
  started_at: string
  minutes: number
  /** true = a full pomodoro; false = stopped early. */
  completed: boolean
  /** For a free focus (no task): the subject studied, if chosen. */
  subject_id?: string | null
}

/** The opening/closing record of one day. */
export interface DayEntry {
  /** The day itself is the key: one entry per date. */
  date: ISODate
  /** Today's must-do task (id), chosen in the opening. */
  must_do: string | null
  /** "Planned or reactive?" answer of the opening. */
  mode: 'planned' | 'reactive' | null
  /** One line from the closing: what went well / what got in the way. */
  reflection: string
  opened_at: string | null
  closed_at: string | null
}

/** A subject you study (Students tab). Not tied to a cycle. */
export interface Subject {
  id: string
  name: string
  /** Colour ("#2a78d6"); null = automatic by order. */
  color: string | null
  /** Free text: professor, room, credits, links… */
  info: string
  /** Study hours you aim for per week (null = none). */
  weekly_hours_target: number | null
  /** Finished subjects can be archived (hidden from the overview). */
  archived: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type TopicStatus = 'todo' | 'progress' | 'mastered'

/** A topic of a subject, e.g. "DCF valuation". */
export interface Topic {
  id: string
  subject_id: string
  name: string
  status: TopicStatus
  /** Marked as difficult (what still needs extra work). */
  difficult: boolean
  notes: string
  sort_order: number
}

export const EXAM_KINDS = ['quiz', 'midterm', 'final', 'assignment', 'other'] as const
export type ExamKind = (typeof EXAM_KINDS)[number]

/** An exam or graded deliverable of a subject. Shown in the calendar. */
export interface Exam {
  id: string
  subject_id: string
  kind: ExamKind
  title: string
  date: ISODate
  start_time: string | null
  /** Share of the final grade, in % (null = unknown). */
  weight: number | null
  /** Grade obtained, 0–10 (null = not yet). */
  grade: number | null
  notes: string
  created_at: string
  updated_at: string
}

/** All user data in one object: what a backup contains. */
export interface AllData {
  cycles: Cycle[]
  goals: Goal[]
  tactics: Tactic[]
  tasks: Task[]
  habits: Habit[]
  habit_checks: HabitCheck[]
  events: CalendarEvent[]
  focus_sessions: FocusSession[]
  days: DayEntry[]
  subjects: Subject[]
  topics: Topic[]
  exams: Exam[]
}

/**
 * Device-specific settings, stored as key/value pairs.
 * They are NOT part of backups (e.g. a backup folder only exists on this laptop).
 */
export interface SettingValues {
  /** ISO timestamp of the last full backup. */
  lastBackupAt: string
  /** The folder chosen for backups (File System Access API handle). */
  backupDirHandle: FileSystemDirectoryHandle
  /** Result of the last persistent-storage request. */
  storagePersisted: PersistStatus
  /** Unfinished setup wizard, so closing the browser doesn't lose it. */
  wizardDraft: unknown
  /** The pomodoro timer in progress (logic/focus.ts). */
  focusTimer: FocusState | null
  /** Pomodoro lengths chosen on this device. */
  focusSettings: FocusSettings
  /** Waking hours used to calculate free time ("HH:MM"). */
  dayWindow: { start: string; end: string }
  /** Average grade you aim for (Students tab), e.g. 9. */
  gradeGoal: number
}
export type SettingKey = keyof SettingValues

export type PersistStatus = 'granted' | 'not-granted' | 'unsupported'
