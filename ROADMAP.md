# Roadmap

## v0.3 (current)

Tactic schedules (tasks appear in the calendar by themselves), .ics
calendar import, and planning the 12 weeks with Claude (copy/paste).

## v0.2

Calendar (week and month views, events, task blocks), Focus (pomodoro
timer that records time on tasks), Habits (Atomic Habits set-up, 7 Habits
categories, streaks), and recurring tactic tasks created automatically
every week.

## v0.1

A complete local-first tracker for one person on one device: setup wizard,
daily Home, weekly Tasks, Goals, Tracking charts, backup/restore,
week export and validated import, English/Spanish, installable PWA,
GitHub Pages hosting.

## Ideas for later

Not planned in detail yet; roughly in order of usefulness.

- **Weekly review notes:** a short "what went well / what got in the way"
  per week, shown on Tracking and in the week report.
- **Miss reasons:** pick a reason when marking a task missed (the
  `miss_reason` field already exists) and see the most common ones.
- **Backup reminder:** offer a one-click backup from the Home badge
  instead of linking to Data.
- **Past cycles:** browse and compare closed cycles in Tracking.
- **Dark mode.**
- **More languages.**

## Out of scope for now

Deliberately left out to keep the app simple and private:

- Cloud sync, accounts or login (the data layer in `src/data/repo.ts` is
  the single place to change if this is ever added)
- Syncing with external calendars (Google, Outlook), push notifications
- AI features
- Sharing data between people
