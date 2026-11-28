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
import type { AllData, Cycle, EventKind } from '../data/types'
import { useI18n } from '../i18n'
import {
  backupFileName,
  buildBackup,
  buildWeekReport,
  isSubjectsFile,
  parseBackup,
  parseImport,
  parseJson,
  weekReportFileName,
  weekReportMarkdown,
  type DataIssue,
  type ImportPlan,
  type ImportTarget,
} from '../logic/exchange'
import { addDays, defaultWeek, isMonday, lastCompletedWeek, nextMonday, todayISO, weekStart } from '../logic/weeks'
import { parseIcs } from '../logic/ics'
import { buildClaudePrompt } from '../logic/claudePrompt'
import { buildSubjectsPrompt } from '../logic/subjectsPrompt'
import { parseSubjectsFile, planCounts, planSubjectsImport, type SubjectsPlan } from '../logic/subjectsImport'
import NumberField from '../components/NumberField'

const SECTIONS = ['backup', 'restore', 'export', 'claude', 'import', 'subjects', 'ics'] as const

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
      <div id="claude" className={highlight('claude')}>
        <PlanWithClaude />
      </div>
      <div id="import" className={highlight('import')}>
        <ImportSection />
      </div>
      <div id="subjects" className={highlight('subjects')}>
        <SubjectsSection />
      </div>
      <div id="ics" className={highlight('ics')}>
        <IcsSection />
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

/** `asNewCycle`: ignore the active cycle and create the file's cycle instead. */
async function checkImport(text: string, asNewCycle = false): Promise<{ issues: DataIssue[]; plan: ImportPlan | null }> {
  const json = parseJson(text)
  if (json.issues.length > 0) return { issues: json.issues, plan: null }
  return parseImport(json.value, asNewCycle ? null : await loadImportTarget())
}

function ImportSection() {
  const { t, date } = useI18n()
  const m = t.data.import
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ issues: DataIssue[]; plan: ImportPlan | null } | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [asNew, setAsNew] = useState(false)
  // A subjects file pasted here goes to the subjects import instead.
  const [subjects, setSubjects] = useState<SubjectsCheck | null>(null)
  const [subjectsDone, setSubjectsDone] = useState(false)

  const check = async (value: string, newCycle = asNew) => {
    setDone(false)
    setSubjectsDone(false)
    setError('')
    const json = parseJson(value)
    if (json.issues.length === 0 && isSubjectsFile(json.value)) {
      setResult(null)
      setSubjects(await checkSubjects(value))
      return
    }
    setSubjects(null)
    setResult(await checkImport(value, newCycle))
  }
  const applySubjects = async () => {
    const fresh = await checkSubjects(text)
    setSubjects(fresh)
    if (!fresh.plan) return
    try {
      await repo.importSubjects(fresh.plan)
      setSubjectsDone(true)
      setSubjects(null)
      setText('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = await readChosenFile(e)
    if (!file) return
    setText(file.text)
    await check(file.text)
  }

  const apply = async () => {
    // Check again right before importing, in case the data changed meanwhile.
    const fresh = await checkImport(text, asNew)
    setResult(fresh)
    if (!fresh.plan) return
    try {
      await repo.applyImport(fresh.plan, { closeActive: asNew })
      setAsNew(false)
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
          setSubjects(null)
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
              setSubjects(null)
              setAsNew(false)
            }}
          >
            {m.clear}
          </button>
        )}
      </div>

      {subjects && (
        <>
          <p className="muted small-text">{m.subjectsDetected}</p>
          <SubjectsPreview result={subjects} onImport={applySubjects} />
        </>
      )}
      {subjectsDone && (
        <p className="flash">
          {t.data.subjects.done} <Link to="/students">{t.data.subjects.goStudies}</Link>
        </p>
      )}

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
            {(plan.cycleIgnored || asNew) && (
              <li className="list-plain">
                <label className="row">
                  <input
                    type="checkbox"
                    checked={asNew}
                    onChange={(e) => {
                      setAsNew(e.target.checked)
                      void check(text, e.target.checked)
                    }}
                  />
                  <strong>{m.startAsNew}</strong>
                </label>
                {asNew && <span className="warn small-text">{m.startAsNewHint}</span>}
              </li>
            )}
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

// ---------- 3a. plan with Claude ----------

const CLAUDE_URL = 'https://claude.ai/new'

function PlanWithClaude() {
  const { t, lang } = useI18n()
  const m = t.data.claude
  const [start, setStart] = useState(nextMonday(todayISO()))
  const [goals, setGoals] = useState('')
  const [hours, setHours] = useState<number | null>(null)
  const [commitments, setCommitments] = useState('')
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)
  const prompt = buildClaudePrompt({ start, goals, hours, commitments }, lang)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied('yes')
    } catch {
      setCopied('no') // clipboard blocked: the text is shown below to copy by hand
    }
  }

  return (
    <>
      <h2>{m.title}</h2>
      <ol className="small-text steps">
        <li>{m.step1}</li>
        <li>{m.step2}</li>
        <li>{m.step3}</li>
      </ol>
      <div className="row">
        <label className="field">
          <span>{m.start}</span>
          <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </label>
        <label className="field">
          <span>{m.hours}</span>
          <NumberField className="num small" value={hours} placeholder="–" onChange={setHours} />
        </label>
      </div>
      {!isMonday(start) && <p className="warn small-text">{t.setup.cycle.mustBeMonday}</p>}
      <label className="field">
        <span>{m.goals}</span>
        <textarea className="textarea" rows={3} placeholder={m.goalsPlaceholder} value={goals} onChange={(e) => setGoals(e.target.value)} />
      </label>
      <label className="field">
        <span>{m.commitments}</span>
        <textarea className="textarea" rows={2} placeholder={m.commitmentsPlaceholder} value={commitments} onChange={(e) => setCommitments(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn primary" onClick={copy}>
          📋 {m.copy}
        </button>
        <a className="btn" href={CLAUDE_URL} target="_blank" rel="noopener noreferrer">
          {m.open} ↗
        </a>
        {copied === 'yes' && <span className="flash">{m.copied}</span>}
      </div>
      <details open={copied === 'no'}>
        <summary className="small-text">{copied === 'no' ? m.copyByHand : m.show}</summary>
        <textarea className="textarea mono" rows={10} readOnly value={prompt} onFocus={(e) => e.target.select()} />
      </details>
      <p className="muted small-text">🔒 {m.privacy}</p>
    </>
  )
}

// ---------- 3c. import subjects (with Claude) ----------

type SubjectsCheck = { issues: DataIssue[]; plan: SubjectsPlan | null }

async function checkSubjects(text: string): Promise<SubjectsCheck> {
  const json = parseJson(text)
  if (json.issues.length > 0) return { issues: json.issues, plan: null }
  const parsed = parseSubjectsFile(json.value)
  if (!parsed.subjects) return { issues: parsed.issues, plan: null }
  const existing = { subjects: await repo.listSubjects(), topics: await repo.listTopics(), exams: await repo.listExams() }
  return { issues: [], plan: planSubjectsImport(parsed.subjects, existing) }
}

function SubjectsSection() {
  const { t, lang } = useI18n()
  const m = t.data.subjects
  const prompt = buildSubjectsPrompt(lang, todayISO())
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<SubjectsCheck | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied('yes')
    } catch {
      setCopied('no') // clipboard blocked: the text is shown below to copy by hand
    }
  }
  const check = async (value: string) => {
    setDone(false)
    setError('')
    setResult(await checkSubjects(value))
  }
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = await readChosenFile(e)
    if (!file) return
    setText(file.text)
    await check(file.text)
  }
  const apply = async () => {
    // Check again right before importing, in case the data changed meanwhile.
    const fresh = await checkSubjects(text)
    setResult(fresh)
    if (!fresh.plan) return
    try {
      await repo.importSubjects(fresh.plan)
      setDone(true)
      setResult(null)
      setText('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <h2>{m.title}</h2>
      <ol className="small-text steps">
        <li>{m.step1}</li>
        <li>{m.step2}</li>
        <li>{m.step3}</li>
      </ol>
      <div className="row">
        <button className="btn primary" onClick={copy}>
          📋 {m.copy}
        </button>
        <a className="btn" href={CLAUDE_URL} target="_blank" rel="noopener noreferrer">
          {t.data.claude.open} ↗
        </a>
        {copied === 'yes' && <span className="flash">{m.copied}</span>}
      </div>
      <details open={copied === 'no'}>
        <summary className="small-text">{copied === 'no' ? t.data.claude.copyByHand : m.show}</summary>
        <textarea className="textarea mono" rows={10} readOnly value={prompt} onFocus={(e) => e.target.select()} />
      </details>

      <h3>{m.importTitle}</h3>
      <label className="btn file-btn">
        {t.data.import.chooseFile}
        <input type="file" accept=".json,application/json" onChange={onFile} />
      </label>
      <textarea
        className="textarea mono"
        rows={4}
        placeholder={m.paste}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setResult(null)
        }}
      />
      <div className="row">
        <button className="btn" disabled={!text.trim()} onClick={() => check(text)}>
          {t.data.import.check}
        </button>
        {text && (
          <button
            className="link"
            onClick={() => {
              setText('')
              setResult(null)
            }}
          >
            {t.data.import.clear}
          </button>
        )}
      </div>

      {result && <SubjectsPreview result={result} onImport={apply} />}
      {error && <p className="bad">{error}</p>}
      {done && (
        <p className="flash">
          {m.done} <Link to="/students">{m.goStudies}</Link>
        </p>
      )}
      <p className="muted small-text">🔒 {t.data.claude.privacy}</p>
    </>
  )
}

/** The problems, or what importing a subjects file will add, with the button. */
function SubjectsPreview({ result, onImport }: { result: SubjectsCheck; onImport: () => void }) {
  const { t } = useI18n()
  const m = t.data.subjects
  const plan = result.plan
  const counts = plan ? planCounts(plan) : null
  const nothingNew = counts && counts.subjects + counts.topics + counts.exams === 0
  return (
    <>
      {result.issues.length > 0 && <Issues title={t.data.import.problems} issues={result.issues} />}
      {plan && counts && (
        <div className="preview">
          <ul>
            {plan.newSubjects.length > 0 && <li>{m.newSubjects(plan.newSubjects.map((s) => s.name).join(', '))}</li>}
            {plan.additions.map((a) => (
              <li key={a.subject.id}>{m.addTo(a.subject.name, a.topics.length, a.exams.length)}</li>
            ))}
            <li>{m.totals(counts.topics, counts.exams)}</li>
            {plan.skipped > 0 && <li className="muted">{m.skipped(plan.skipped)}</li>}
          </ul>
          {nothingNew ? (
            <p className="muted">{m.nothingNew}</p>
          ) : (
            <button className="btn primary" onClick={onImport}>
              {m.button}
            </button>
          )}
        </div>
      )}
    </>
  )
}

// ---------- 3b. calendar file (.ics) ----------

function IcsSection() {
  const { t, date } = useI18n()
  const m = t.data.ics
  const [file, setFile] = useState<{ name: string; text: string } | null>(null)
  const [from, setFrom] = useState(addDays(todayISO(), -7))
  const [kind, setKind] = useState<EventKind | ''>('')
  const [done, setDone] = useState<{ added: number; updated: number } | null>(null)
  const result = file ? parseIcs(file.text, from) : null
  const looksWrong = file !== null && !/BEGIN:VCALENDAR/i.test(file.text)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = await readChosenFile(e)
    if (!chosen) return
    setDone(null)
    setFile(chosen)
  }
  const apply = async () => {
    if (!result) return
    if (!kind) return
    setDone(await repo.importIcsEvents(result.events, kind))
    setFile(null)
  }

  const n = result?.notes
  const weekly = result?.events.filter((e) => e.repeat_weekly).length ?? 0
  return (
    <>
      <h2>{m.title}</h2>
      <p className="muted small-text">{m.hint}</p>
      <div className="row">
        <label className="btn file-btn">
          {m.choose}
          <input type="file" accept=".ics,text/calendar" onChange={onFile} />
        </label>
        <label className="row small-text">
          <span>{m.from}</span>
          <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </label>
      </div>
      {looksWrong && <p className="bad">{m.notIcs}</p>}
      {result && !looksWrong && (
        <div className="preview">
          <p>
            <strong>{file!.name}</strong>: {m.found(result.events.length, weekly)}
          </p>
          {result.events.length > 0 && (
            <ul className="small-text">
              {result.events.slice(0, 6).map((e) => (
                <li key={e.ics_uid}>
                  {date(e.date)} {e.start_time ? `${e.start_time}–${e.end_time}` : m.allDay} · {e.repeat_weekly ? '↻ ' : ''}
                  {e.title}
                </li>
              ))}
              {result.events.length > 6 && <li className="muted">{m.andMore(result.events.length - 6)}</li>}
            </ul>
          )}
          {n && (n.repeatsSimplified > 0 || n.multiDay > 0 || n.skippedBefore > 0 || n.skippedCancelled + n.skippedExceptions > 0) && (
            <ul className="muted small-text">
              {n.skippedBefore > 0 && <li>{m.skippedBefore(n.skippedBefore)}</li>}
              {n.repeatsSimplified > 0 && <li>{m.repeatsSimplified(n.repeatsSimplified)}</li>}
              {n.multiDay > 0 && <li>{m.multiDay(n.multiDay)}</li>}
              {n.skippedCancelled + n.skippedExceptions > 0 && <li>{m.skippedOther(n.skippedCancelled + n.skippedExceptions)}</li>}
            </ul>
          )}
          {result.events.length > 0 && (
            <>
              <label className="field">
                <span>{m.kindLabel}</span>
                <select value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
                  <option value="">{m.kindChoose}</option>
                  <option value="class">{t.calendar.kinds.class}</option>
                  <option value="deadline">{t.calendar.kinds.deadline}</option>
                  <option value="other">{t.calendar.kinds.other}</option>
                </select>
              </label>
              <button className="btn primary" onClick={apply} disabled={!kind}>
                {m.button(result.events.length)}
              </button>
            </>
          )}
        </div>
      )}
      {done && (
        <p className="flash">
          {m.done(done.added, done.updated)} <Link to="/calendar">{m.openCalendar}</Link>
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
