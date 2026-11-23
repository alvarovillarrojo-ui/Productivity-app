# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/alvarovillarrojo-ui/Productivity-app/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/alvarovillarrojo-ui/Productivity-app/releases/tag/v0.1.0
