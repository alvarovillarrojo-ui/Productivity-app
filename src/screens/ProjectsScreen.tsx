// Projects: any project in your life (logic/projects.ts).
//   /projects      – the list: progress, steps done, deadline, links
//   /projects/:id  – one project: progress (from its steps, or by hand),
//                    links (deadline, goal, subject + class work), notes, steps
// Each step is a normal task: it shows in Tasks, and in the calendar if it
// has a date and a time.
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useGoals, useTactics } from '../data/hooks'
import { useLive } from '../data/useLive'
import type { Exam, Goal, Project, Subject, Tactic, Task } from '../data/types'
import { useI18n } from '../i18n'
import NumberField from '../components/NumberField'
import SubjectSelect from '../components/SubjectSelect'
import TacticSelect, { tacticLabel } from '../components/TacticSelect'
import TaskRow from '../components/TaskRow'
import TextField from '../components/TextField'
import { DateInput, TimeInput } from '../components/DateTimeInput'
import { projectProgress, type ProjectProgress } from '../logic/projects'
import { examDates } from '../logic/study'
import { daysBetween, todayISO } from '../logic/weeks'

export default function ProjectsScreen() {
  const { id } = useParams()
  return id ? <ProjectPage id={id} /> : <ProjectList />
}

function useLinks() {
  const cycle = useActiveCycle()
  const goals = useGoals(cycle?.id)
  const tactics = useTactics(cycle?.id)
  const subjects = useLive(repo.listSubjects, [], [] as Subject[])
  return { cycle, goals, tactics, subjects }
}

/** "Fitness › Run", "Corporate Finance", "in 12 days"… */
function useLinkLabels() {
  const { t } = useI18n()
  const m = t.projects
  return (p: Project, goals: Goal[], tactics: Tactic[], subjects: Subject[], today: string) =>
    [
      p.deadline && (p.deadline < today ? m.overdue : m.dueIn(daysBetween(today, p.deadline))),
      p.tactic_id && tactics.some((x) => x.id === p.tactic_id) && `🎯 ${tacticLabel(p.tactic_id, goals, tactics, '')}`,
      p.subject_id && subjects.find((s) => s.id === p.subject_id) && `🎓 ${subjects.find((s) => s.id === p.subject_id)!.name}`,
    ].filter(Boolean) as string[]
}

function ProgressBar({ progress }: { progress: ProjectProgress }) {
  const pct = progress.value === null ? null : Math.round(progress.value * 100)
  return (
    <div className="project-progress">
      <div className="bar-track" role="progressbar" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100}>
        <div className="bar-fill" style={{ width: `${pct ?? 0}%`, background: 'var(--accent)' }} />
      </div>
      <span className="bar-value">{pct === null ? '–' : `${pct}%`}</span>
    </div>
  )
}

// ---------- the list ----------

function ProjectList() {
  const { t } = useI18n()
  const m = t.projects
  const navigate = useNavigate()
  const projects = useLive(repo.listProjects, [], [] as Project[])
  const steps = useLive(repo.listAllProjectSteps, [], [] as Task[])
  const { goals, tactics, subjects } = useLinks()
  const labels = useLinkLabels()
  const today = todayISO()
  const [name, setName] = useState('')

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const p = await repo.createProject(name)
    setName('')
    navigate(`/projects/${p.id}`)
  }

  const open = projects.filter((p) => p.status === 'active')
  const done = projects.filter((p) => p.status === 'done')
  const card = (p: Project) => {
    const progress = projectProgress(p, steps.filter((s) => s.project_id === p.id))
    const tags = labels(p, goals, tactics, subjects, today)
    return (
      <Link key={p.id} to={`/projects/${p.id}`} className={`card project-card${p.status === 'done' ? ' done' : ''}`}>
        <strong>{p.status === 'done' ? '✓ ' : '📁 '}{p.name}</strong>
        <ProgressBar progress={progress} />
        <span className="muted small-text">
          {progress.total ? m.stepsDone(progress.done, progress.total) : m.noSteps}
          {tags.length > 0 && ` · ${tags.join(' · ')}`}
        </span>
      </Link>
    )
  }

  return (
    <section className="stack">
      <h1>{m.title}</h1>
      <p className="muted">{m.intro}</p>
      <form className="card row" onSubmit={add}>
        <input className="grow" placeholder={m.newPlaceholder} aria-label={m.name} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary" type="submit" disabled={!name.trim()}>
          + {m.add}
        </button>
      </form>
      {open.length === 0 && done.length === 0 && <p className="muted">{m.empty}</p>}
      {open.length > 0 && <div className="project-grid">{open.map(card)}</div>}
      {done.length > 0 && (
        <>
          <h2>{m.finished}</h2>
          <div className="project-grid">{done.map(card)}</div>
        </>
      )}
    </section>
  )
}

// ---------- one project ----------

function ProjectPage({ id }: { id: string }) {
  const { t, date } = useI18n()
  const m = t.projects
  const navigate = useNavigate()
  // null while loading; undefined = no such project.
  const project = useLive(async () => (await repo.getProject(id)) ?? undefined, [id], null as Project | undefined | null)
  const steps = useLive(() => repo.listProjectSteps(id), [id], [] as Task[])
  const exams = useLive(() => repo.listExams(), [], [] as Exam[])
  const { cycle, goals, tactics } = useLinks()

  if (project === null) return null
  if (project === undefined) return <p className="muted">{m.notFound} <Link to="/projects">{m.back}</Link></p>

  const p = project
  const save = (changes: Partial<Project>) => repo.updateProject(p.id, changes)
  const progress = projectProgress(p, steps)
  const subjectExams = exams.filter((e) => e.subject_id === p.subject_id)
  const linkedExam = subjectExams.find((e) => e.id === p.exam_id)
  const examLabel = (e: Exam) => `${e.title || t.students.kinds[e.kind]} · ${date(e.date)}`
  const remove = async () => {
    if (!confirm(m.confirmDelete(p.name))) return
    await repo.deleteProject(p.id)
    navigate('/projects')
  }

  return (
    <section className="stack">
      <Link to="/projects" className="muted">
        ← {m.back}
      </Link>
      <div className="card stack">
        <div className="row spread">
          <TextField className="grow project-name" value={p.name} required ariaLabel={m.name} onSave={(name) => save({ name })} />
          <label className="row small-text">
            <input type="checkbox" checked={p.status === 'done'} onChange={(e) => save({ status: e.target.checked ? 'done' : 'active' })} />
            {m.markDone}
          </label>
          <button className="link danger" onClick={remove}>
            {t.common.delete}
          </button>
        </div>
        <ProgressBar progress={progress} />
        <p className="muted small-text">
          {progress.total ? m.stepsDone(progress.done, progress.total) : m.noSteps}
          {progress.manual && ` · ${m.manualOn}`}
        </p>
        <div className="row small-text">
          <span>{m.manualLabel}</span>
          <NumberField className="num small" max={100} placeholder={progress.auto === null ? '–' : String(Math.round(progress.auto * 100))} value={p.manual_progress} onChange={(v) => save({ manual_progress: v })} />
          <span>%</span>
          {progress.manual && (
            <button className="link" onClick={() => save({ manual_progress: null })}>
              {m.backToAuto}
            </button>
          )}
        </div>
      </div>

      <div className="card stack">
        <h2>🔗 {m.linksTitle}</h2>
        <label className="field">
          <span>{m.deadline}</span>
          <DateInput value={p.deadline ?? ''} onChange={(v) => save({ deadline: v || null })} />
          <span className="muted small-text">{m.deadlineHint}</span>
        </label>
        <label className="field">
          <span>{m.goal}</span>
          <TacticSelect goals={goals} tactics={tactics} value={p.tactic_id} onChange={(v) => save({ tactic_id: v })} />
          <span className="muted small-text">{m.goalHint}</span>
        </label>
        <div className="field">
          <span>{m.subject}</span>
          <SubjectSelect value={p.subject_id} onChange={(v) => save({ subject_id: v, exam_id: null })} />
        </div>
        {p.subject_id && (
          <label className="field">
            <span>{m.classWork}</span>
            <select value={p.exam_id ?? ''} onChange={(e) => save({ exam_id: e.target.value || null })}>
              <option value="">{m.noClassWork}</option>
              {subjectExams.map((e) => (
                <option key={e.id} value={e.id}>
                  {examLabel(e)}
                </option>
              ))}
            </select>
            {linkedExam && (
              <ul className="small-text project-dates">
                {examDates([linkedExam]).map((d) => (
                  <li key={d.deliverable?.id ?? 'final'}>
                    📌 {d.deliverable?.title || linkedExam.title || t.students.kinds[linkedExam.kind]} · {date(d.date)}
                    {d.start_time ? ` ${d.start_time}` : ''}
                  </li>
                ))}
              </ul>
            )}
            {linkedExam && !p.deadline && (
              <button type="button" className="link small-text" onClick={() => save({ deadline: linkedExam.date })}>
                {m.useExamDate(date(linkedExam.date))}
              </button>
            )}
          </label>
        )}
        <label className="field">
          <span>{m.notes}</span>
          <TextField multiline value={p.notes} placeholder={m.notesPlaceholder} ariaLabel={m.notes} onSave={(notes) => save({ notes })} />
        </label>
      </div>

      <div className="card stack">
        <h2>🪜 {m.stepsTitle}</h2>
        <p className="muted small-text">{m.stepsHint}</p>
        {cycle === null ? <p className="warn small-text">{m.noCycle}</p> : <StepForm projectId={p.id} />}
        {steps.length === 0 ? (
          <p className="muted">{m.noSteps}</p>
        ) : (
          <ul className="task-list">
            {steps.map((s) => (
              <TaskRow
                key={s.id}
                task={s}
                context={tacticLabel(s.tactic_id, goals, tactics, t.common.other)}
                onDelete={() => confirm(m.confirmDeleteStep(s.title)) && repo.deleteTask(s.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function StepForm({ projectId }: { projectId: string }) {
  const { t } = useI18n()
  const m = t.projects
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [hours, setHours] = useState<number | null>(null)
  const [error, setError] = useState('')

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const step = { title, date: date || null, time: date && time ? time : null, hours }
    setError('')
    try {
      await repo.addProjectStep(projectId, step, todayISO())
      setTitle('')
      setTime('')
      setHours(null)
    } catch (err) {
      const code = (err as Error).message
      setError(code === 'outsideCycle' ? m.outsideCycle : code === 'noCycle' ? m.noCycle : code)
    }
  }

  return (
    <form className="quick-add" onSubmit={add}>
      <input className="grow" placeholder={m.stepPlaceholder} aria-label={m.stepName} value={title} onChange={(e) => setTitle(e.target.value)} />
      <DateInput aria-label={t.tasks.dateOptional} title={t.tasks.dateOptional} value={date} onChange={setDate} />
      <TimeInput aria-label={t.tasks.timeOptional} title={date ? t.tasks.timeOptional : t.tasks.timeNeedsDate} disabled={!date} value={time} onChange={setTime} />
      <NumberField className="num small" ariaLabel={t.tasks.hoursOptional} placeholder="h" value={hours} onChange={setHours} />
      <button className="btn primary" type="submit" disabled={!title.trim()}>
        + {m.addStep}
      </button>
      {error && <span className="bad small-text">{error}</span>}
    </form>
  )
}
