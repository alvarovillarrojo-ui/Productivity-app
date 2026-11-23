# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Day screen with the daily Opening and Closing. Opening: week and cycle days
  left, planned or reactive, today's must-do (also on Home), today's
  schedule, free time (waking hours minus the calendar, adjustable), a
  3-week deadlines radar (one-off events), what's lagging (execution below
  target, hours behind pace, overdue tasks, habits at risk) and today's
  habits. Closing: today's tasks to mark, day score, a reflection (listed in
  Tracking) and the open habits. Saved per day and part of backups.
- Fail causes: marking a task ✗ offers Planning, Unforeseen, Energy or
  Meaning; Tracking shows the causes per week and the most frequent one.

### Added

- Delete a cycle: Goals → Cycles lists every cycle (active and closed) with
  its goals and tasks, and deletes one after a clear warning. Habits and
  calendar events are kept.
- Colours: choose each goal's colour (Goals) and each event's colour (event
  window); the calendar shows a legend. Colours are part of backups.

- ½ for a task’s minimum version: a third button (✓ · ½ · ✗) on Home,
  Tasks and the calendar. A ½ counts half in execution %
  ((done + ½ partial) ÷ counted); Tracking, week reports and the Markdown
  report show it.
- Minimum version per tactic (Goals, import files `"minimum"`, and in the
  Plan-with-Claude prompt), shown next to the tactic’s open tasks.
- Import files: tasks can have a `"time"`; the status `"partial"`.

## [0.3.0] - 2026-11-23

### Added

- Plan your 12 weeks with Claude (Data, and a link on the welcome screen):
  answer a few questions, copy the generated prompt into Claude, and paste
  Claude’s whole reply into Import. The import box now finds the JSON in a
  pasted chat answer, and a plan can be started as a new cycle (the current
  one is closed and kept in history).

- Import a calendar file (.ics) from Google Calendar, Outlook or a
  university timetable (Data → Import a calendar, or from the Calendar).
  Preview first; weekly repeats kept (several weekdays → several weekly
  events); times converted to local time; an optional “from” date leaves
  out old history; importing the same file again updates instead of
  duplicating.

- Tactic schedules: choose the days, time and duration of a tactic in Goals
  (or with `days`, `time`, `hours` in an import file). Its weekly tasks are
  then created on those days and appear in the calendar by themselves; this
  week's unplaced tasks are placed when the schedule is saved.

## [0.2.0] - 2026-11-23

### Added

- Tracking: habit consistency, focus time and pomodoros per week.
- About page: the calendar, focus timer and habits.
- Focus (pomodoro) screen: 25 min focus / 5 min break (15 every 4th), with
  pause, stop-and-save and adjustable lengths. A finished round adds its
  minutes to the task’s actual hours and asks whether the task is done.
  The timer keeps running on other screens (badge in the top bar and in the
  tab title) and plays a short sound. Start it from ▶ on any open task or
  from a calendar block. Sessions are logged and included in backups.
- Calendar: week view with hours and month view. Add events (classes,
  exams, meetings), optionally repeating every week; place tasks at a day
  and time as blocks coloured by goal (overlaps shown side by side); tick or
  move them from the calendar. Tasks list their time, and the task edit form
  has a time field.
- Habits, set up the Atomic Habits way (identity, habit stacking, plan,
  2-minute version, reward) and grouped by the 7 Habits of Highly Effective
  People, with suggestions per category. Tick them per day in Tasks → Habits
  or on Home; streaks, weekly consistency % and a “never miss twice” warning.
  Habits have their own score and are included in backups (v0.1 backups
  still restore).

### Changed

- Recurring tasks are now created automatically every week from each
  tactic’s “times per week” (next week’s from Saturday). Deleted tasks don’t
  come back; raising a frequency adds the missing tasks right away. The
  “Generate recurring tasks” button is gone.

## [0.1.0] - 2026-11-23

First version.

### Added

- Local-first storage in the browser (IndexedDB via Dexie) behind a single
  data-access layer; asks the browser for persistent storage.
- Setup wizard for a new cycle (welcome, review of the previous cycle with
  carry-over, vision, cycle dates, goals, tactics, summary). The draft is
  saved as you type.
- Home: today's tasks and this week's open tasks with one-click done/missed,
  quick-add, this week's execution % per goal (85% target) and hours against
  target/minimum, last-backup badge.
- Tasks: weekly list with week picker, quick-add, edit and delete, generate
  recurring tasks from tactic frequencies, copy unfinished tasks to next week.
- Goals: edit the cycle, goals (weekly hour target and minimum) and tactics
  (times per week, active/inactive).
- Tracking: cycle totals, execution % per week chart (overall and per goal),
  week-by-week table, hours per goal per week.
- Data: full backup to a chosen folder (File System Access API) or as a
  download; restore with validation and confirmation; export of one week as
  JSON and Markdown (vision only on request); import from JSON (schema 1.0,
  references by name) with validation and preview, add-only.
- About / How to use page.
- English and Spanish interface with a language switch.
- Installable PWA that works offline; fixed dev port 5180.
- Unit tests for metrics, week calculations, task actions, the setup wizard,
  the data layer and import/export.
- Docs: import/export format (`docs/import_schema.md`) and a sample import
  file (`examples/sample_import.json`).

[Unreleased]: https://github.com/alvarovillarrojo-ui/Productivity-app/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/alvarovillarrojo-ui/Productivity-app/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/alvarovillarrojo-ui/Productivity-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/alvarovillarrojo-ui/Productivity-app/releases/tag/v0.1.0
