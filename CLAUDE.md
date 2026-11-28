# CLAUDE.md: guide for working on this project

A personal **12 Week Year** execution tracker: a local-first React +
TypeScript + Vite PWA. Live at https://alvarovillarrojo-ui.github.io/Productivity-app/
(repo `alvarovillarrojo-ui/Productivity-app`, branch `main`).

## Working with the owner

- A finance student, **not a software engineer**. Explain in plain words, with
  step-by-step instructions to run and check things.
- **Plan first, then build** in small steps. Ask only real decisions
  (`AskUserQuestion`), with a recommended option.
- After each step, report:
  - what changed
  - what was checked
  - how to try it
- **Never deploy yourself.** The Pages workflow runs only when the owner
  clicks *Run workflow*
  (https://github.com/alvarovillarrojo-ui/Productivity-app/actions/workflows/deploy.yml).
- **After a deploy:**
  - Verify via the GitHub API that the run succeeded on the right SHA.
  - Check that the live bundle contains new strings.
  - Run a quick live test with throwaway data, then delete it.
  - Installed copies update after a reload or two (service worker).

## Commands (Windows)

- PowerShell blocks `npm` scripts: use **`npm.cmd`** (`npm.cmd run dev`,
  `npm.cmd test`). In Bash, `npx` works.
- Dev server: **http://localhost:5180** (strictPort; `.claude/launch.json` → "dev").
- Checks before every commit:
  - `npx tsc -b`
  - `npx vitest run`
  - `npm run build` (then `rm -rf dist`)
- Git lives at `/c/Program Files/Git/cmd`, so add it to PATH in Bash.
  - Use a repo-local identity.
  - Commits are small, conventional, and **end with the Co-Authored-By line**.
  - Push after every step.

## Rules

- **Every UI text exists in English and Spanish.** `src/i18n/en.ts` defines
  the structure, and `es.ts` must match it (TypeScript enforces this). The
  owner uses Spanish.
- **Privacy:**
  - The app never sends data anywhere.
  - `private/` (the owner's real plan `cycle1_plan.json` and
    `cycle1_deadlines.ics`), exports and backups are git-ignored.
  - Before committing, check that nothing in `private/` is staged.
- **Storage:**
  - All storage access goes through `src/data/repo.ts`.
  - Schema changes add a new `this.version(n)` in `src/data/db.ts`
    (currently v9). New record fields are optional, so old data and backups
    still load.
  - Add every new field and table to the backup checks: `FIELDS` and
    `OPTIONAL_TABLES` in `src/logic/exchange.ts`.
- **Logic:** pure logic lives in `src/logic/*.ts` with Vitest tests (~194).
  Keep calculations there, not in screens.
- **Editing files by script:** in Node, use `s.replace(a, () => b)`, because a
  string replacement treats `$&` and `$'` as special. Prefer the Edit tool
  for small changes.

## Structure

```
src/data/       types.ts (all shapes), db.ts (Dexie), repo.ts (only storage access), hooks.ts, useLive.ts, files.ts
src/logic/      metrics, weeks, taskActions (recurring blocks, isBlock), calendar, day (free time, radar, lagging),
                habits, focus (pomodoro), study (grades, hours), exchange (import/export/backup), ics, claudePrompt
src/screens/    Home, Day (opening/closing), Tasks (+HabitsPanel), Calendar, Studies, Focus, Goals, Tracking, Data, About, setup/
src/components/ TaskRow, StatusButtons (+StatusBadge), CausePicker, QuickAdd, Modal, ColorPicker, DeadlinesCard,
                useCalendarEvents (events + exams), FocusRunner (+FocusBadge), AutoRecurring, SubjectSelect …
```

The app shell (`App.tsx`) is a sidebar on computers and a bottom bar + "More"
sheet on phones. The style lives in `src/styles.css`: calm & modern, Inter
font bundled, indigo accent, CSS variables at the top.

## Key concepts (decided with the owner)

- **Cycle → goals → tactics.** A tactic has:
  - times per week, or a **schedule** (days, time, hours)
  - a **minimum version** (worth ½)
  - **"Show on Home"**
- **Blocks vs tasks:**
  - Items created automatically from tactics are **blocks** (`kind: 'block'`).
    They live in the calendar and are marked ✓ ½ ✗ **only in Day → Closing**
    (today's, earlier unmarked ones, and those without a fixed day).
  - **Tasks** (`kind: 'todo'`) are things to do, tickable anywhere.
  - Older items are recognised as blocks by their title (`isBlock`).
- **Execution %** = (done + ½·partial) ÷ (done + partial + missed + overdue).
  Target 85%. Tasks with no tactic ("Other") don't count.
- **Fail causes** on ✗: Planificación · Imprevisto · Energía · Sentido.
- **Tasks inside a block:** a task can have `block_id` (what you will do in
  that session). Added/ticked from the block in the calendar, shown under it
  in Day → Closing; the block shows "☑ done/total" and its tasks are not
  repeated on their own in the calendar.
- **Colours** (logic/areas.ts): tasks and blocks take their goal's colour.
  Events take their area's colour ( table). The fixed areas are
  Uni (also  events), Día a día, Viajes, Exámenes (all exams) and
  Entregas (deliverables, projects, group work,  events). They have
   set, are created at start, and can't be deleted. The user can add more.
- **Calendar events** have a type (`class` / `deadline` / `other`).
  - Only deadlines and subject exams reach the **deadlines radar** (3 weeks;
    shown on Home and in Day → Opening).
  - The `.ics` import asks for the type.
- **Habits** (Atomic Habits + the 7 Habits categories) and **Focus**
  (pomodoros) have their own numbers and don't change execution %.
- **Studies:** subjects with exams (weight %, grade → weighted average), topics
  (status, difficult, notes) and study hours from subject-linked tasks, free
  pomodoros and time logged by hand (`study_logs`).
  - Exam types include **Project** and **Group work**, which can have extra
    dates (`deliverables`); each date is a calendar event `exam:<id>:<dId>`.
  - Tasks, free pomodoros and logs can name a `topic_id` or `exam_id`; the
    subject page shows hours by topic and exam (`studyBreakdown`).
- **Inbox** (`inbox` table): notes jotted down on Home; dealt with in Day →
  Opening/Closing (→ task today, → this week, or done).
- **Form fields:** use `NumberField` (accepts "3,5") and `DateInput` /
  `TimeInput` (components/DateTimeInput) instead of raw number/date/time inputs.
- **Plan with Claude:** a copy/paste prompt (Data). The app never calls an AI
  itself.

## Testing in the browser pane

- Use localhost and seed data through `await import('/src/data/repo.ts')` in
  the page.
- Replace `window.confirm = () => true` for dialogs.
- Afterwards, delete the `twelve-week-tracker` IndexedDB and reset the
  viewport.
- Check phone width (no element wider than the screen) and the console.
- The owner's real files can be fetched in dev from `/private/…` for realistic
  tests. Never commit them.

## Open items

- The owner ticked "something else" for the Opening but never said what. Ask.
- The owner's scoring differs from the app's (80% target with an amber band;
  the weekly total is the average of the 3 goals). Offered but not built.
- The pomodoro end sound has never been confirmed by ear.
