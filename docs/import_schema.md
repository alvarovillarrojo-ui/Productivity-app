# Import / export file format (schema 1.0)

The app reads and writes plain JSON files. This page describes them so you can
write an import file by hand (or with a spreadsheet or an AI assistant) and
know exactly what an export contains.

There are three kinds of file:

| File | Made by | Read by | What it does |
| --- | --- | --- | --- |
| **Import file** | you | Data → Import | **Adds** goals, tactics and tasks |
| **Week report** (`week_XX_report.json`) | Data → Export a week | Data → Import | Summary of one week; can be imported again |
| **Backup** (`12wt-backup-YYYY-MM-DD.json`) | Data → Backup | Data → Restore | **Replaces** all data |

A ready-to-use example is in [`examples/sample_import.json`](../examples/sample_import.json).

---

## 1. Import file

```json
{
  "schema_version": "1.0",
  "cycle":  { … },        // optional, see below
  "goals":  [ … ],        // optional
  "tasks":  [ … ]         // optional
}
```

Goals, tactics and tasks refer to each other by **name**, not by id. Names are
matched ignoring upper/lower case and surrounding spaces.

### What importing does

- **Only adds.** Nothing that already exists is changed or deleted.
- If a cycle is **active** in the app, everything goes into it. A `cycle` in
  the file is then ignored (the preview says so).
- If **no cycle is active**, the file **must** have a `cycle`; it is created
  as the active cycle.
- A goal whose name already exists is reused (its target hours are **not**
  changed). Its tactics are matched by name too; new ones are added.
- A task that already exists (same week, same title, same goal and tactic) is
  skipped, so importing the same file twice adds nothing the second time.
  A file may list the same task more than once (e.g. “Run 5 km” on Monday and
  on Wednesday); each copy is matched against one existing copy.
- Before anything is saved, the app shows a **preview**. If the file has any
  problem, nothing is imported and every problem is listed with its place in
  the file (e.g. `tasks[3].week_number`).

### `cycle`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | text | yes | |
| `start_date` | `"YYYY-MM-DD"` | yes | Must be a **Monday**. Week 1 starts on this day. |
| `length_weeks` | whole number 1–52 | no | Default `12`. |
| `vision` | text or `null` | no | Private long-term vision. |
| `notes` | text | no | |

### `goals[]`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | text | yes | Unique within the file. |
| `description` | text | no | |
| `weekly_hours_target` | number ≥ 0 | yes | Hours per week you aim for. `0` is allowed. |
| `weekly_hours_minimum` | number ≥ 0 or `null` | no | Must not be higher than the target. |
| `tactics` | list | no | See below. |

### `goals[].tactics[]`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | text | yes | Unique within its goal. |
| `description` | text | no | |
| `weekly_frequency` | whole number 1–14 or `null` | no | Times per week. Used by “Generate recurring tasks”. |
| `active` | `true` / `false` | no | Default `true`. Inactive tactics are hidden when adding tasks. |

### `tasks[]`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `week_number` | whole number | yes | 1 to the cycle’s length. |
| `title` | text | yes | |
| `goal` | text or `null` | with `tactic` | Name of the goal the tactic belongs to. |
| `tactic` | text or `null` | no | Must exist in the file’s goals or in the active cycle. Without a tactic the task is **Other**: shown, but not counted in execution %. |
| `planned_date` | `"YYYY-MM-DD"` or `null` | no | Must fall inside that week (Monday–Sunday). |
| `planned_hours` | number ≥ 0 or `null` | no | |
| `actual_hours` | number ≥ 0 or `null` | no | |
| `status` | `"todo"`, `"done"` or `"missed"` | no | Default `"todo"`. |
| `notes` | text | no | |

Unknown fields are ignored.

### Minimal example

```json
{
  "schema_version": "1.0",
  "cycle": { "name": "Spring", "start_date": "2027-02-01" },
  "goals": [
    {
      "name": "Fitness",
      "weekly_hours_target": 3,
      "tactics": [{ "name": "Run 5 km", "weekly_frequency": 3 }]
    }
  ],
  "tasks": [
    { "week_number": 1, "title": "Run 5 km", "goal": "Fitness", "tactic": "Run 5 km" }
  ]
}
```

---

## 2. Week report

Data → Export a week downloads two files for the chosen week:

- `week_XX_report.md`: a readable report (execution table, hours, tasks).
- `week_XX_report.json`: an **import file** (same fields as above) plus a few
  read-only extras:

| Field | Meaning |
| --- | --- |
| `kind` | `"week_report"` |
| `exported_at` | Time of export (ISO timestamp) |
| `week`, `week_start`, `week_end` | The week and its Monday and Sunday |
| `cycle` | `name`, `start_date`, `length_weeks`; `vision` **only** if “Include my vision” was ticked |
| `goals` | All goals of the cycle with their tactics |
| `tasks` | All tasks of that week |
| `summary.execution` | `overall` and `by_goal`: `pct` (0–100 or `null`), `done`, `missed`, `overdue`, `upcoming` |
| `summary.hours` | Per goal: `actual`, `target`, `minimum`, `level` (`target` / `minimum` / `below`) |
| `summary.other_hours` | Hours logged on tasks without a tactic |

`summary` is ignored when the file is imported.

**Execution %** = done ÷ (done + missed + overdue), where *overdue* means open
tasks whose date has passed, or any open task once the week has ended. Tasks
without a tactic are not counted.

---

## 3. Backup

A complete copy of the app’s data, **with ids**, used only by Restore:

```json
{
  "schema_version": "1.0",
  "kind": "backup",
  "app": "twelve-week-tracker",
  "exported_at": "2026-11-23T18:05:00.000Z",
  "data": {
    "cycles": [ … ], "goals": [ … ], "tactics": [ … ], "tasks": [ … ],
    "habits": [ … ], "habit_checks": [ … ], "events": [ … ], "focus_sessions": [ … ]
  }
}
```

`habits`, `habit_checks`, `events` and `focus_sessions` were added in v0.2;
backups made with v0.1 don’t have them and still restore (as empty lists).
Tasks may also have a `start_time` (`"HH:MM"` or `null`) since v0.2.

Each record has exactly the fields described in
[`src/data/types.ts`](../src/data/types.ts). Before restoring, the app checks
that every record is complete and that every link (goal → cycle,
tactic → goal, task → cycle / tactic) points to a record in the file.
Restoring **replaces everything**; device settings (backup folder, language)
are kept.

Backups are not meant to be edited by hand. To add data, use an import file.
