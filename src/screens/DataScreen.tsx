// Data: everything about files.
//   1. Backup   – one file with all data (to a chosen folder, or downloaded)
//   2. Restore  – replace all data with a backup (with a clear warning)
//   3. Export   – one week as JSON + Markdown report
//   4. Import   – add goals/tactics/tasks from a JSON file, after a preview
// Links like #/data?action=import (from the welcome screen) jump to a section.
import { useEffect, useState, type ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as repo from '../data/repo'
import { useGoals, useTactics } from '../data/hooks'
import { useLive } from '../data/useLive'
import { canPickFolder, downloadFile, ensurePermission, isCancel, pickFolder, writeToFolder } from '../data/files'
import type { AllData, Cycle } from '../data/types'
import { useI18n } from '../i18n'
import {
  backupFileName,
  buildBackup,
  buildWeekReport,
  parseBackup,
  parseImport,
  parseJson,
  weekReportFileName,
  weekReportMarkdown,
  type DataIssue,
  type ImportPlan,
  type ImportTarget,
} from '../logic/exchange'
import { defaultWeek, lastCompletedWeek, todayISO, weekStart } from '../logic/weeks'

const SECTIONS = ['backup', 'restore', 'export', 'import'] as const

export default function DataScreen() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const action = params.get('action')
  // The active cycle, or the most recent one if none is active.
  const cycles = useLive(repo.listCycles, [], null as Cycle[] | null)
  const cycle = cycles ? (cycles.find((c) => c.status === 'active') ?? cycles[0] ?? null) : undefined

  useEffect(() => {
    if (action && (SECTIONS as readonly string[]).includes(action)) {
      document.getElementById(action)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [action, cycle === undefined])

  if (cycle === undefined) return null
  const highlight = (id: string) => (id === action ? 'card stack highlight' : 'card stack')

  return (
    <section className="stack data">
      <h1>{t.data.title}</h1>
      <p className="muted">{t.data.intro}</p>
      {cycle && (
        <div id="backup" className={highlight('backup')}>
          <BackupSection />
        </div>
      )}
      {cycle && (
        <div id="export" className={highlight('export')}>
          <ExportSection cycle={cycle} />
        </div>
      )}
      <div id="import" className={highlight('import')}>
        <ImportSection />
      </div>
      <div id="restore" className={highlight('restore')}>
        <RestoreSection />
      </div>
    </section>
  )
}

// ---------- shared bits ----------

function Issues({ title, issues }: { title: string; issues: DataIssue[] }) {
  const { t } = useI18n()
  return (
    <div className="errors-box">
      <p>{title}</p>
      <ul>
        {issues.map((i, n) => (
          <li key={n}>{t.data.issue(i)}</li>
        ))}
      </ul>
    </div>
  )
}

/** Reads the chosen file as text and resets the input (so the same file can be chosen again). */
async function readChosenFile(e: ChangeEvent<HTMLInputElement>): Promise<{ name: string; text: string } | null> {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return null
  return { name: file.name, text: await file.text() }
}

// ---------- 1. backup ----------

function BackupSection() {
  const { t, locale } = useI18n()
  const b = t.data.backup
  const last = useLive(async () => (await repo.getSetting('lastBackupAt')) ?? null, [], null)
  const folder = useLive(async () => (await repo.getSetting('backupDirHandle')) ?? null, [], null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const folderSupported = canPickFolder()

  const run = async (mode: 'saved' | 'pick' | 'download') => {
    setBusy(true)
    setMessage('')
    try {
      const now = new Date()
      const name = backupFileName(todayISO(now))
      const text = JSON.stringify(buildBackup(await repo.exportAll(), now.toISOString()), null, 2)
      if (mode === 'download' || !folderSupported) {
        downloadFile(name, text, 'application/json')
        setMessage(b.downloaded(name))
      } else {
        let dir = mode === 'saved' ? folder : null
        if (!dir || !(await ensurePermission(dir))) {
          dir = await pickFolder()
          await repo.setSetting('backupDirHandle', dir)
        }
        await writeToFolder(dir, name, text)
        setMessage(b.savedFolder(name, dir.name))
      }
      await repo.setSetting('lastBackupAt', now.toISOString())
    } catch (e) {
      if (!isCancel(e)) setMessage(b.failed((e as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const when = last
    ? new Date(last).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <h2>{b.title}</h2>
      <p className="muted small-text">{b.hint}</p>
      <p>{when ? b.last(when) : <strong className="warn">{b.never}</strong>}</p>
      {folderSupported ? (
        <>
          <div className="row">
            <button className="btn primary" disabled={busy} onClick={() => run('saved')}>
              {folder ? b.now : b.chooseFolder}
            </button>
            {folder && (
              <button className="btn" disabled={busy} onClick={() => run('pick')}>
                {b.changeFolder}
              </button>
            )}
            <button className="link" disabled={busy} onClick={() => run('download')}>
              {b.downloadInstead}
            </button>
          </div>
          {folder && <p className="muted small-text">📁 {b.folder(folder.name)}</p>}
        </>
      ) : (
        <>
          <button className="btn primary" disabled={busy} onClick={() => run('download')}>
            {b.download}
          </button>
          <p className="muted small-text">{b.noFolderSupport}</p>
        </>
      )}
      {message && <p className="flash">{message}</p>}
    </>
  )
}

// ---------- 2. export a week ----------

function ExportSection({ cycle }: { cycle: Cycle }) {
  const { t, date } = useI18n()
  const x = t.data.export
  const today = todayISO()
  const goals = useGoals(cycle.id)
  const tactics = useTactics(cycle.id)
  const completed = lastCompletedWeek(cycle, today)
  const [week, setWeek] = useState(completed ?? defaultWeek(cycle, today))
  const [includeVision, setIncludeVision] = useState(false)
  const [message, setMessage] = useState('')

  const download = async (ext: 'json' | 'md') => {
    const report = buildWeekReport({
      cycle,
      week,
      goals,
      tactics,
      weekTasks: await repo.listTasksForWeek(cycle.id, week),
      today,
      includeVision,
      exportedAt: new Date().toISOString(),
    })
    const name = weekReportFileName(week, ext)
    if (ext === 'json') downloadFile(name, JSON.stringify(report, null, 2), 'application/json')
    else downloadFile(name, weekReportMarkdown(report, t, date), 'text/markdown')
    setMessage(x.downloaded(name))
  }

  return (
    <>
      <h2>{x.title}</h2>
      <p className="muted small-text">{x.hint}</p>
      <div className="row">
        <label className="row">
          <span>{x.week}</span>
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {Array.from({ length: cycle.length_weeks }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                {t.tasks.weekOption(w, date(weekStart(cycle, w)))}
                {w === completed ? x.lastCompleted : ''}
              </option>
            ))}
          </select>
        </label>
        {cycle.vision && (
          <label className="row">
            <input type="checkbox" checked={includeVision} onChange={(e) => setIncludeVision(e.target.checked)} />
            {x.includeVision}
          </label>
        )}
      </div>
      <div className="row">
        <button className="btn" onClick={() => download('json')}>
          {x.json}
        </button>
        <button className="btn" onClick={() => download('md')}>
          {x.md}
        </button>
        {message && <span className="flash">{message}</span>}
      </div>
    </>
  )
}

// ---------- 3. import ----------

async function loadImportTarget(): Promise<ImportTarget | null> {
  const cycle = await repo.getActiveCycle()
  if (!cycle) return null
  const [goals, tactics, tasks] = await Promise.all([
    repo.listGoals(cycle.id),
    repo.listTacticsForCycle(cycle.id),
    repo.listTasksForCycle(cycle.id),
  ])
  return { cycle, goals, tactics, tasks }
}

async function checkImport(text: string): Promise<{ issues: DataIssue[]; plan: ImportPlan | null }> {
  const json = parseJson(text)
  if (json.issues.length > 0) return { issues: json.issues, plan: null }
  return parseImport(json.value, await loadImportTarget())
}

function ImportSection() {
  const { t, date } = useI18n()
  const m = t.data.import
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ issues: DataIssue[]; plan: ImportPlan | null } | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const check = async (value: string) => {
    setDone(false)
    setError('')
    setResult(await checkImport(value))
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = await readChosenFile(e)
    if (!file) return
    setText(file.text)
    await check(file.text)
  }

  const apply = async () => {
    // Check again right before importing, in case the data changed meanwhile.
    const fresh = await checkImport(text)
    setResult(fresh)
    if (!fresh.plan) return
    try {
      await repo.applyImport(fresh.plan)
      setDone(true)
      setResult(null)
      setText('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const plan = result?.plan
  const nothingNew =
    plan && plan.cycle.kind === 'existing' && plan.newGoals.length + plan.newTactics.length + plan.tasks.length === 0

  return (
    <>
      <h2>{m.title}</h2>
      <p className="muted small-text">{m.hint}</p>
      <label className="btn file-btn">
        {m.chooseFile}
        <input type="file" accept=".json,application/json" onChange={onFile} />
      </label>
      <textarea
        className="textarea mono"
        rows={5}
        placeholder={m.paste}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setResult(null)
        }}
      />
      <div className="row">
        <button className="btn" disabled={!text.trim()} onClick={() => check(text)}>
          {m.check}
        </button>
        {text && (
          <button
            className="link"
            onClick={() => {
              setText('')
              setResult(null)
            }}
          >
            {m.clear}
          </button>
        )}
      </div>

      {result && result.issues.length > 0 && <Issues title={m.problems} issues={result.issues} />}

      {plan && (
        <div className="preview">
          <ul>
            <li>
              {plan.cycle.kind === 'existing'
                ? m.into(plan.cycle.name)
                : m.newCycle(plan.cycle.data.name, date(plan.cycle.data.start_date), plan.cycle.data.length_weeks)}
            </li>
            {plan.cycleIgnored && <li className="muted">{m.cycleIgnored}</li>}
            {plan.newGoals.length > 0 && <li>{m.newGoals(plan.newGoals.map((g) => g.name).join(', '))}</li>}
            {(plan.newTactics.length > 0 || plan.newGoals.some((g) => g.tactics.length > 0)) && (
              <li>
                {m.newTactics(
                  [
                    ...plan.newGoals.flatMap((g) => g.tactics.map((x) => `${g.name} → ${x.name}`)),
                    ...plan.newTactics.map((x) => `${x.goal} → ${x.tactic.name}`),
                  ].join(', '),
                )}
              </li>
            )}
            {plan.tasks.length > 0 && <li>{m.tasks(plan.tasks.length)}</li>}
            {plan.duplicates > 0 && <li className="muted">{m.duplicates(plan.duplicates)}</li>}
          </ul>
          {nothingNew ? (
            <p className="muted">{m.nothingNew}</p>
          ) : (
            <button className="btn primary" onClick={apply}>
              {m.button}
            </button>
          )}
        </div>
      )}
      {error && <p className="bad">{error}</p>}
      {done && (
        <p className="flash">
          {m.done} <Link to="/">{m.goHome}</Link>
        </p>
      )}
    </>
  )
}

// ---------- 4. restore ----------

function RestoreSection() {
  const { t, locale } = useI18n()
  const m = t.data.restore
  const [checked, setChecked] = useState<{ issues: DataIssue[]; data: AllData | null; exportedAt: string | null } | null>(
    null,
  )
  const [done, setDone] = useState(false)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = await readChosenFile(e)
    if (!file) return
    setDone(false)
    const json = parseJson(file.text)
    setChecked(json.issues.length > 0 ? { issues: json.issues, data: null, exportedAt: null } : parseBackup(json.value))
  }

  const restore = async () => {
    if (!checked?.data || !confirm(m.confirm)) return
    await repo.replaceAll(checked.data)
    setChecked(null)
    setDone(true)
  }

  const data = checked?.data
  return (
    <>
      <h2>{m.title}</h2>
      <p className="warn-box small-text">⚠ {m.hint}</p>
      <label className="btn file-btn">
        {m.choose}
        <input type="file" accept=".json,application/json" onChange={onFile} />
      </label>
      {checked && checked.issues.length > 0 && <Issues title={m.problems} issues={checked.issues} />}
      {data && (
        <div className="preview">
          <p>
            {m.contains(data.cycles.length, data.goals.length, data.tactics.length, data.tasks.length)}{' '}
            {checked.exportedAt &&
              m.madeOn(new Date(checked.exportedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }))}
          </p>
          <button className="btn danger" onClick={restore}>
            {m.button}
          </button>
        </div>
      )}
      {done && (
        <p className="flash">
          {m.done} <Link to="/">{t.data.import.goHome}</Link>
        </p>
      )}
    </>
  )
}
