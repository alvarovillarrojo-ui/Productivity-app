// The shapes of everything the app stores.
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
  planned_hours: number | null
  actual_hours: number | null
  status: TaskStatus
  /** Kept for a future version; not used in the UI yet. */
  miss_reason: string | null
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
}
export type SettingKey = keyof SettingValues

export type PersistStatus = 'granted' | 'not-granted' | 'unsupported'
