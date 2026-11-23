# 12 Week Tracker

A personal execution tracker for the **12 Week Year** method. Plan a 12-week
cycle with a few goals and the tactics that make them happen, then each week
list your tasks, tick them off, and see your **execution %** (aim for 85%) and
**hours** against your targets.

- 🔒 **Local-first and private.** Your data lives only in your browser
  (IndexedDB) on your device. No account, no server, nothing is ever sent
  anywhere.
- 🌍 English and Spanish (switch in the top bar).
- 📱 Installable as an app and works offline (PWA).

## Screens

| Screen | What it's for |
| --- | --- |
| **Setup** | Guided wizard for a new cycle: vision, dates, goals, tactics. Reviews the previous cycle first. |
| **Home** | The daily routine: today's tasks, one-click ✓ / ✗, this week's execution and hours, last backup. |
| **Tasks** | The weekly list: quick-add, edit; tactic tasks are created automatically every week; copy unfinished tasks to next week. |
| **Calendar** | Week (hours) and month views: events such as classes or exams, and your tasks placed at a time. |
| **Focus** | Pomodoro timer for a task; finished rounds add their minutes to the task’s hours. |
| **Goals** | Edit the cycle, goals (hour targets) and tactics (times per week). |
| **Tracking** | The whole cycle: execution % per week (chart), week-by-week table, hours per goal. |
| **Data** | Backup / restore, export a week (JSON + Markdown), plan your 12 weeks with Claude, import from JSON, import a calendar (.ics). |
| **About** | How to use the method and the app; how the numbers are calculated. |

## How execution % is calculated

`done ÷ (done + missed + overdue)`, where *overdue* = open tasks whose date has
passed, or any open task once its week has ended. Tasks for today or later
don't count yet. Tasks without a tactic ("Other") are shown but not counted.
All formulas live in [`src/logic/metrics.ts`](src/logic/metrics.ts) and are
covered by unit tests.

## Run it on your computer

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install        # once
npm run dev        # start the app → http://localhost:5180
npm test           # run the unit tests
npm run build      # production build into dist/
```

> **Windows PowerShell:** if `npm` is blocked with "running scripts is
> disabled", use `npm.cmd` instead (e.g. `npm.cmd run dev`).

The app always uses port **5180** (`strictPort`). Browser data is tied to the
exact address, so a different port would open with empty data.

## Your data

- Each browser and each device keeps its **own** data. Clearing the site's
  data in the browser deletes it.
- **Back up weekly** from the Data screen. In Chrome/Edge you can pick a
  folder once (ideally one synced to the cloud) and then back up with one
  click; other browsers download the file.
- To move to another device or browser: back up, then **Restore** there.
- To start from a file, import [`examples/sample_import.json`](examples/sample_import.json)
  or your own file. The format is described in
  [`docs/import_schema.md`](docs/import_schema.md).
- **Plan with Claude:** Data → “Plan your 12 weeks with Claude” builds a
  prompt from a few answers. Paste it in Claude (claude.ai); Claude replies
  with a plan in the import format; paste the whole reply in Data → Import
  (you can start it as a new cycle). The app never contacts Claude itself.
- Personal files (`private/`, exports, backups) are listed in `.gitignore`
  and are never committed.

## Hosting on GitHub Pages

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
runs the tests, builds the app with `BASE_PATH=/<repo>/` and publishes it to
`https://<user>.github.io/<repo>/`.

First time:

1. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Actions → Deploy to GitHub Pages → Run workflow**.

It only runs when started by hand. To deploy on every push to `main`,
uncomment the `push:` lines at the top of the workflow.

The hosted app is just static files. Each visitor's data stays in their own
browser; the hosted site (and GitHub) has no access to it. Data on the hosted
site is separate from data on `localhost:5180`: move it with Backup → Restore.

## Project structure

```
src/
  data/       types, database (Dexie), repo.ts = the only storage access, file saving
  logic/      pure functions: weeks, metrics, task actions, import/export (all tested)
  screens/    one file per screen (+ setup/ for the wizard steps)
  components/ shared UI pieces
  i18n/       en.ts (defines all texts) and es.ts (must have the same keys)
docs/         file format
examples/     sample import file
```

## Tech

React + TypeScript + Vite, Dexie (IndexedDB), Recharts, vite-plugin-pwa,
Vitest. See [ROADMAP.md](ROADMAP.md) and [CHANGELOG.md](CHANGELOG.md).

## Licence

[MIT](LICENSE)
