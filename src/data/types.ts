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
export type TaskStatus = 'todo' | 'done' | 'missed'

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
  /** Kept for a future version; not used in the UI yet. */
  miss_reason: string | null
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
}
export type SettingKey = keyof SettingValues

export type PersistStatus = 'granted' | 'not-granted' | 'unsupported'
