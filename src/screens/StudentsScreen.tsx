// Students ("Estudios"): your subjects.
//   /students      → overview: overall average vs goal, study hours this
//                    week, upcoming exams, one card per subject
//   /students/:id  → one subject: info, exams (weight, grade), topics
//                    (status, difficult, notes), study hours, this week's
//                    study tasks
// Exams also appear in the Calendar and in Day → deadlines radar.
import { Fragment, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useGoals, useTactics } from '../data/hooks'
import { useLive } from '../data/useLive'
import {
  EXAM_KINDS,
  type Cycle,
  type Deliverable,
  type Exam,
  type ExamKind,
  type FocusSession,
  type StudyLog,
  type Subject,
  type Task,
  type Topic,
  type TopicStatus,
} from '../data/types'
import { useI18n } from '../i18n'
import TextField from '../components/TextField'
import NumberField from '../components/NumberField'
import ColorPicker from '../components/ColorPicker'
import TaskRow from '../components/TaskRow'
import TacticSelect, { minimumOf, tacticLabel } from '../components/TacticSelect'
import { goalColor } from '../components/colors'
import { subjectColorOf } from '../components/useCalendarEvents'
import { formatHours, formatPct } from '../logic/metrics'
import { isBlock } from '../logic/taskActions'
import { difficultTopics, examDates, nextExam, overallAverage, studyBreakdown, studyHours, subjectGrades, topicProgress, type StudyBreakdown } from '../logic/study'
import StudyTargetSelect, { type StudyTarget } from '../components/StudyTargetSelect'
import { addDays, defaultWeek, mondayOf, todayISO } from '../logic/weeks'
import { DateInput, TimeInput } from '../components/DateTimeInput'

const DEFAULT_GRADE_GOAL = 9
const UPCOMING_DAYS = 30

const subjectColor = subjectColorOf
/** "Final", "Group work — Presentation". */
const examLabel = (e: Exam, d: Deliverable | null, kind: string) => `${e.title || kind}${d ? ` — ${d.title || '…'}` : ''}`
/** Projects and group work can have several dates (deliverables). */
const hasDeliverables = (kind: ExamKind) => kind === 'project' || kind === 'group'
const fmtGrade = (g: number | null) => (g === null ? '–' : (Math.round(g * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 }))

/** Everything both views need, live. */
function useStudyData() {
  const subjects = useLive(repo.listSubjects, [], [] as Subject[])
  const topics = useLive(() => repo.listTopics(), [], [] as Topic[])
  const exams = useLive(() => repo.listExams(), [], [] as Exam[])
  const tasks = useLive(repo.listStudyTasks, [], [] as Task[])
  const sessions = useLive(repo.listAllFocusSessions, [], [] as FocusSession[])
  const logs = useLive(() => repo.listStudyLogs(), [], [] as StudyLog[])
  const cycle = useActiveCycle() ?? null
  const today = todayISO()
  const monday = mondayOf(today)
  const sunday = addDays(monday, 6)
  const week = cycle ? defaultWeek(cycle, today) : 0
  // "This week": tasks dated this week, or of the cycle's current week; pomodoros of this week.
  const inWeek = {
    task: (t: Task) => (t.planned_date ? t.planned_date >= monday && t.planned_date <= sunday : !!cycle && t.cycle_id === cycle.id && t.week_number === week),
    session: (s: FocusSession) => s.date >= monday && s.date <= sunday,
    log: (l: StudyLog) => l.date >= monday && l.date <= sunday,
  }
  return { subjects, topics, exams, tasks, sessions, logs, cycle, today, week, inWeek }
}

export default function StudentsScreen() {
  const { id } = useParams()
  return id ? <SubjectPage id={id} /> : <Overview />
}

// ---------- overview ----------

function Overview() {
  const { t, date } = useI18n()
  const s = t.students
  const navigate = useNavigate()
  const { subjects, topics, exams, tasks, sessions, logs, today, inWeek } = useStudyData()
  const goal = useLive(async () => (await repo.getSetting('gradeGoal')) ?? DEFAULT_GRADE_GOAL, [], DEFAULT_GRADE_GOAL)
  const [showArchived, setShowArchived] = useState(false)

  const active = subjects.filter((x) => !x.archived)
  const archived = subjects.filter((x) => x.archived)
  const avgOf = (id: string) => subjectGrades(exams.filter((e) => e.subject_id === id)).average
  const overall = overallAverage(active.map((x) => avgOf(x.id)))
  const weekHours = active.reduce((sum, x) => sum + studyHours(x.id, tasks, sessions, inWeek, logs), 0)
  const upcoming = examDates(exams.filter((e) => active.some((x) => x.id === e.subject_id))).filter(
    (d) => d.date >= today && d.date <= addDays(today, UPCOMING_DAYS),
  )
  const indexOf = (x: Subject) => subjects.indexOf(x)

  const add = async () => {
    const created = await repo.createSubject(s.newSubjectName)
    navigate(`/students/${created.id}`)
  }

  return (
    <section className="stack students">
      <div className="row spread">
        <div>
          <h1>{s.title}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {s.intro}
          </p>
        </div>
        <button className="btn primary" onClick={add}>
          {s.newSubject}
        </button>
      </div>

      <div className="study-kpis">
        <div className="card kpi">
          <span className="muted small-text">{s.overall}</span>
          <span className={`kpi-value ${overall === null ? 'muted' : overall >= goal ? 'good' : 'bad'}`}>{fmtGrade(overall)}</span>
          <label className="row small-text muted">
            {s.goal}
            <NumberField className="num small" step={0.1} min={0} max={10} value={goal} onChange={(v) => v !== null && repo.setSetting('gradeGoal', v)} />
          </label>
        </div>
        <div className="card kpi">
          <span className="muted small-text">{s.hoursWeek}</span>
          <span className="kpi-value">{formatHours(weekHours)}</span>
        </div>
        <div className="card kpi grow-2">
          <span className="muted small-text">{s.upcoming}</span>
          {upcoming.length === 0 ? (
            <span className="muted">{s.noUpcoming}</span>
          ) : (
            <ul className="upcoming">
              {upcoming.slice(0, 4).map((d) => {
                const e = d.exam
                const subj = subjects.find((x) => x.id === e.subject_id)!
                const days = Math.round((Date.parse(d.date) - Date.parse(today)) / 86400000)
                return (
                  <li key={`${e.id}:${d.deliverable?.id ?? ''}`}>
                    <span className="dot-color" style={{ background: subjectColor(subj, indexOf(subj)) }} />
                    <Link to={`/students/${subj.id}`}>{subj.name}</Link> · {examLabel(e, d.deliverable, s.kinds[e.kind])}{' '}
                    <span className={days <= 3 ? 'bad' : days <= 7 ? 'warn' : 'muted'}>
                      · {date(d.date)} ({days === 0 ? t.day.today : days === 1 ? t.day.tomorrow : t.day.inDays(days)})
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {active.length === 0 ? (
        <p className="note">{s.empty}</p>
      ) : (
        <div className="subject-grid">
          {active.map((x) => (
            <SubjectCard
              key={x.id}
              subject={x}
              color={subjectColor(x, indexOf(x))}
              exams={exams.filter((e) => e.subject_id === x.id)}
              topics={topics.filter((tp) => tp.subject_id === x.id)}
              hoursWeek={studyHours(x.id, tasks, sessions, inWeek, logs)}
              today={today}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <details open={showArchived} onToggle={(e) => setShowArchived((e.target as HTMLDetailsElement).open)}>
          <summary className="muted">{s.showArchived(archived.length)}</summary>
          <ul className="archived-list">
            {archived.map((x) => (
              <li key={x.id}>
                <Link to={`/students/${x.id}`}>{x.name}</Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function SubjectCard({
  subject,
  color,
  exams,
  topics,
  hoursWeek,
  today,
}: {
  subject: Subject
  color: string
  exams: Exam[]
  topics: Topic[]
  hoursWeek: number
  today: string
}) {
  const { t } = useI18n()
  const s = t.students
  const next = nextExam(exams, today)
  const avg = subjectGrades(exams).average
  const hard = difficultTopics(topics).length
  const target = subject.weekly_hours_target
  const pct = target ? Math.min(1, hoursWeek / target) : 0
  return (
    <Link to={`/students/${subject.id}`} className="card subject-card" style={{ borderTopColor: color }}>
      <strong className="subject-name">{subject.name}</strong>
      <span className={next ? (next.daysLeft <= 7 ? 'bad small-text' : 'small-text') : 'muted small-text'}>
        📅 {next ? `${s.nextExam(next.daysLeft)} · ${examLabel(next.exam, next.deliverable, s.kinds[next.exam.kind])}` : s.noExams}
      </span>
      <div>
        <div className="mini-bar">
          <div style={{ width: `${pct * 100}%`, background: color }} />
        </div>
        <span className="muted small-text">⏱ {s.hoursOf(formatHours(hoursWeek), target ? formatHours(target) : null)}</span>
      </div>
      <div className="row spread small-text">
        <span>
          {s.average}: <strong>{avg === null ? s.noGrades : fmtGrade(avg)}</strong>
        </span>
        {hard > 0 && <span className="warn">⚠ {s.difficult(hard)}</span>}
      </div>
    </Link>
  )
}

// ---------- one subject ----------

function SubjectPage({ id }: { id: string }) {
  const { t } = useI18n()
  const s = t.students
  const navigate = useNavigate()
  const { subjects, topics, exams, tasks, sessions, logs, cycle, today, week, inWeek } = useStudyData()
  const subject = subjects.find((x) => x.id === id)
  if (subjects.length > 0 && !subject) {
    return (
      <section className="stack">
        <Link to="/students">{s.back}</Link>
        <p className="muted">{s.notFound}</p>
      </section>
    )
  }
  if (!subject) return null

  const index = subjects.indexOf(subject)
  const color = subjectColor(subject, index)
  const mine = exams.filter((e) => e.subject_id === id)
  const myTopics = topics.filter((x) => x.subject_id === id)
  const grades = subjectGrades(mine)
  const next = nextExam(mine, today)
  const hoursWeek = studyHours(id, tasks, sessions, inWeek, logs)
  const hoursTotal = studyHours(id, tasks, sessions, {}, logs)
  const breakdown = studyBreakdown(id, myTopics, mine, tasks, sessions, logs)
  const save = (changes: Partial<Subject>) => repo.updateSubject(id, changes)

  const remove = async () => {
    if (!confirm(s.confirmDelete(subject.name))) return
    await repo.deleteSubject(id)
    navigate('/students')
  }

  return (
    <section className="stack students">
      <Link to="/students" className="small-text">
        {s.back}
      </Link>
      <div className="card stack subject-head" style={{ borderTopColor: color }}>
        <div className="row spread">
          <TextField className="goal-name grow" ariaLabel={s.title} value={subject.name} required onSave={(name) => save({ name })} />
          <div className="row">
            <button className="btn" onClick={() => save({ archived: !subject.archived })}>
              {subject.archived ? s.unarchive : s.archive}
            </button>
            <button className="link danger" onClick={remove}>
              {s.deleteSubject}
            </button>
          </div>
        </div>
        <div className="row small-text">
          <span className="muted">{s.color}</span>
          <ColorPicker value={subject.color} auto={goalColor(index)} label={s.color} autoLabel={s.autoColor} onChange={(c) => save({ color: c })} />
        </div>
      </div>

      <div className="study-kpis">
        <div className="card kpi">
          <span className="muted small-text">{s.stats.week}</span>
          <span className="kpi-value">{formatHours(hoursWeek)}</span>
          <label className="row small-text muted">
            {s.stats.target}
            <NumberField className="num small" value={subject.weekly_hours_target} placeholder="–" onChange={(v) => save({ weekly_hours_target: v })} />
          </label>
        </div>
        <div className="card kpi">
          <span className="muted small-text">{s.stats.total}</span>
          <span className="kpi-value">{formatHours(hoursTotal)}</span>
        </div>
        <div className="card kpi">
          <span className="muted small-text">{s.stats.average}</span>
          <span className="kpi-value">{fmtGrade(grades.average)}</span>
          {grades.totalWeight > 0 && <span className="muted small-text">{s.stats.graded(grades.gradedWeight, grades.totalWeight)}</span>}
        </div>
        <div className="card kpi">
          <span className="muted small-text">{s.exams}</span>
          <span className={`kpi-value small ${next && next.daysLeft <= 7 ? 'bad' : ''}`}>{next ? s.nextExam(next.daysLeft) : s.noExams}</span>
        </div>
      </div>

      <div className="card stack">
        <h2>{s.info}</h2>
        <TextField multiline rows={3} className="textarea" placeholder={s.infoPlaceholder} value={subject.info} onSave={(info) => save({ info })} />
      </div>

      <ExamsCard subjectId={id} exams={mine} today={today} />
      <TopicsCard subjectId={id} topics={myTopics} hours={breakdown.topics} />
      <HoursCard
        subjectId={id}
        topics={myTopics}
        exams={mine}
        breakdown={breakdown}
        logs={logs.filter((l) => l.subject_id === id)}
        today={today}
        color={color}
      />
      {cycle && <StudyTasksCard subjectId={id} cycle={cycle} week={week} tasks={tasks.filter((x) => x.subject_id === id && inWeek.task(x))} />}
      <p className="muted small-text">{s.hoursHint}</p>
    </section>
  )
}

// ---------- exams ----------

function ExamsCard({ subjectId, exams, today }: { subjectId: string; exams: Exam[]; today: string }) {
  const { t } = useI18n()
  const s = t.students
  const add = () => repo.createExam({ subject_id: subjectId, kind: 'final', title: '', date: today, start_time: null, weight: null, grade: null, notes: '' })
  return (
    <div className="card stack">
      <div className="row spread">
        <h2>{s.exams}</h2>
        <button className="btn" onClick={add}>
          {s.addExam}
        </button>
      </div>
      {exams.length > 0 && (
        <div className="table-scroll">
          <table className="data-table exams-table">
            <thead>
              <tr>
                <th>{s.kind}</th>
                <th>{s.examTitle}</th>
                <th>{s.date}</th>
                <th>{s.time}</th>
                <th className="num-col">{s.weight}</th>
                <th className="num-col">{s.grade}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <ExamRow key={e.id} exam={e} past={e.date < today} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ExamRow({ exam, past }: { exam: Exam; past: boolean }) {
  const { t } = useI18n()
  const s = t.students
  const save = (changes: Partial<repo.NewExam>) => repo.updateExam(exam.id, changes)
  const list = exam.deliverables ?? []
  const setList = (deliverables: Deliverable[]) => save({ deliverables })
  const change = (id: string, patch: Partial<Deliverable>) => setList(list.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  return (
    <Fragment>
      <tr className={past ? 'past-exam' : undefined}>
        <td>
          <select value={exam.kind} onChange={(e) => save({ kind: e.target.value as ExamKind })}>
            {EXAM_KINDS.map((k) => (
              <option key={k} value={k}>
                {s.kinds[k]}
              </option>
            ))}
          </select>
        </td>
        <td>
          <TextField ariaLabel={s.examTitle} placeholder={s.kinds[exam.kind]} value={exam.title} onSave={(title) => save({ title })} />
        </td>
        <td>
          <DateInput value={exam.date} onChange={(v) => v && save({ date: v })} />
        </td>
        <td>
          <TimeInput value={exam.start_time ?? ''} onChange={(v) => save({ start_time: v || null })} />
        </td>
        <td className="num-col">
          <NumberField className="num small" step={5} max={100} value={exam.weight} placeholder="–" onChange={(v) => save({ weight: v })} />
        </td>
        <td className="num-col">
          <NumberField
            className="num small"
            step={0.1}
            max={10}
            value={exam.grade}
            placeholder="–"
            onChange={(v) => save({ grade: v === null ? null : Math.min(10, v) })}
          />
        </td>
        <td>
          <button className="link danger" aria-label={t.common.delete} onClick={() => confirm(s.confirmDeleteExam) && repo.deleteExam(exam.id)}>
            ✕
          </button>
        </td>
      </tr>
      {hasDeliverables(exam.kind) && (
        <tr className="deliverables-row">
          <td colSpan={7}>
            <div className="deliverables stack-tight">
              <span className="small-text">
                <strong>{s.deliverables}</strong> <span className="muted">· {s.deliverablesHint}</span>
              </span>
              {[...list]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((d) => (
                  <div key={d.id} className="row deliverable">
                    <span aria-hidden>↳</span>
                    <TextField
                      ariaLabel={s.deliverableTitle}
                      placeholder={s.deliverablePlaceholder}
                      value={d.title}
                      onSave={(title) => change(d.id, { title })}
                    />
                    <DateInput aria-label={s.date} value={d.date} onChange={(v) => v && change(d.id, { date: v })} />
                    <TimeInput
                      aria-label={s.time}
                      value={d.start_time ?? ''}
                      onChange={(v) => change(d.id, { start_time: v || null })}
                    />
                    <button
                      className="link danger"
                      aria-label={t.common.delete}
                      onClick={() => confirm(s.confirmDeleteDeliverable) && setList(list.filter((x) => x.id !== d.id))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              <div>
                <button className="link" onClick={() => setList([...list, { id: repo.newId(), title: '', date: exam.date, start_time: null }])}>
                  {s.addDeliverable}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

// ---------- topics ----------

function TopicsCard({ subjectId, topics, hours }: { subjectId: string; topics: Topic[]; hours: Map<string, number> }) {
  const { t } = useI18n()
  const s = t.students
  const [name, setName] = useState('')
  const [onlyHard, setOnlyHard] = useState(false)
  const shown = onlyHard ? topics.filter((x) => x.difficult) : topics
  const progress = topicProgress(topics)

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    void repo.createTopic(subjectId, name.trim())
    setName('')
  }

  return (
    <div className="card stack">
      <div className="row spread">
        <h2>
          {s.topics} {progress !== null && <span className="muted small-text">· {s.progress(formatPct(progress))}</span>}
        </h2>
        <label className="row small-text">
          <input type="checkbox" checked={onlyHard} onChange={(e) => setOnlyHard(e.target.checked)} />
          {s.onlyDifficult}
        </label>
      </div>
      <form onSubmit={add}>
        <input className="grow" style={{ width: '100%' }} placeholder={s.topicPlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
      </form>
      {shown.length === 0 ? (
        <p className="muted">{s.noTopics}</p>
      ) : (
        <ul className="topic-list">
          {shown.map((x) => (
            <TopicRow key={x.id} topic={x} hours={hours.get(x.id) ?? 0} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TopicRow({ topic, hours }: { topic: Topic; hours: number }) {
  const { t } = useI18n()
  const s = t.students
  const [open, setOpen] = useState(topic.notes !== '')
  const save = (changes: Partial<Topic>) => repo.updateTopic(topic.id, changes)
  const statuses: TopicStatus[] = ['todo', 'progress', 'mastered']
  return (
    <li className={`topic-row status-${topic.status}${topic.difficult ? ' hard' : ''}`}>
      <div className="row spread">
        <TextField className="topic-name grow" ariaLabel={s.topics} value={topic.name} required onSave={(name) => save({ name })} />
        <div className="row">
          {hours > 0 && <span className="muted small-text">⏱ {formatHours(hours)}</span>}
          <div className="seg">
            {statuses.map((st) => (
              <button key={st} className={topic.status === st ? 'on' : undefined} aria-pressed={topic.status === st} onClick={() => save({ status: st })}>
                {s.topicStatus[st]}
              </button>
            ))}
          </div>
          <button
            className={topic.difficult ? 'chip small hard on' : 'chip small hard'}
            aria-pressed={topic.difficult}
            onClick={() => save({ difficult: !topic.difficult })}
          >
            ⚠ {s.difficultFlag}
          </button>
          <button className="link small-text" onClick={() => setOpen(!open)}>
            📝 {s.notes}
          </button>
          <button className="link danger" aria-label={t.common.delete} onClick={() => confirm(s.confirmDeleteTopic(topic.name)) && repo.deleteTopic(topic.id)}>
            ✕
          </button>
        </div>
      </div>
      {open && <TextField multiline rows={2} className="textarea" placeholder={s.notesPlaceholder} value={topic.notes} onSave={(notes) => save({ notes })} />}
    </li>
  )
}

// ---------- hours by topic / exam, and time logged by hand ----------

function HoursCard({
  subjectId,
  topics,
  exams,
  breakdown,
  logs,
  today,
  color,
}: {
  subjectId: string
  topics: Topic[]
  exams: Exam[]
  breakdown: StudyBreakdown
  logs: StudyLog[]
  today: string
  color: string
}) {
  const { t, date } = useI18n()
  const s = t.students
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState(today)
  const [hours, setHours] = useState<number | null>(null)
  const [target, setTarget] = useState<StudyTarget>({ topic_id: null, exam_id: null })
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  // One line per topic / exam with hours, plus "subject in general"; most hours first.
  const rows = [
    ...topics.filter((x) => breakdown.topics.has(x.id)).map((x) => ({ key: x.id, label: x.name, hours: breakdown.topics.get(x.id)! })),
    ...exams.filter((x) => breakdown.exams.has(x.id)).map((x) => ({ key: x.id, label: `📅 ${x.title || s.kinds[x.kind]}`, hours: breakdown.exams.get(x.id)! })),
    ...(breakdown.general > 0 ? [{ key: 'general', label: s.general, hours: breakdown.general }] : []),
  ].sort((a, b) => b.hours - a.hours)
  const max = Math.max(0, ...rows.map((r) => r.hours))
  const labelOf = (l: StudyLog) => {
    const tp = l.topic_id ? topics.find((x) => x.id === l.topic_id) : undefined
    const ex = l.exam_id ? exams.find((x) => x.id === l.exam_id) : undefined
    return tp ? tp.name : ex ? ex.title || s.kinds[ex.kind] : s.general
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hours === null || hours <= 0) return setError(s.needHours)
    await repo.createStudyLog({ subject_id: subjectId, ...target, date: day, hours, note: note.trim() })
    setHours(null)
    setNote('')
    setError('')
    setOpen(false)
  }

  return (
    <div className="card stack">
      <div className="row spread">
        <h2>{s.byTarget}</h2>
        {!open && (
          <button className="btn" onClick={() => setOpen(true)}>
            {s.logTime}
          </button>
        )}
      </div>
      {open && (
        <form className="log-form stack-tight" onSubmit={save}>
          <div className="row">
            <label className="field">
              <span>{s.date}</span>
              <DateInput value={day} onChange={(v) => v && setDay(v)} />
            </label>
            <label className="field">
              <span>{s.logHours}</span>
              <NumberField className="num small" step={0.25} min={0} value={hours} placeholder="1.5" onChange={setHours} />
            </label>
            <label className="field">
              <span>{s.studyFor}</span>
              <StudyTargetSelect subjectId={subjectId} value={target} onChange={setTarget} />
            </label>
            <label className="field grow">
              <span>{s.logNote}</span>
              <input value={note} placeholder={s.logNotePlaceholder} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          {error && <p className="bad">{error}</p>}
          <div className="row">
            <button className="btn primary" type="submit">
              {t.common.save}
            </button>
            <button className="btn" type="button" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </button>
          </div>
        </form>
      )}
      {rows.length === 0 ? (
        <p className="muted">{s.noHoursYet}</p>
      ) : (
        <ul className="hours-list">
          {rows.map((r) => (
            <li key={r.key}>
              <span className="hours-label">{r.label}</span>
              <span className="mini-bar hours-bar">
                <span style={{ width: `${max ? (r.hours / max) * 100 : 0}%`, background: color }} />
              </span>
              <strong className="hours-value">{formatHours(r.hours)}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small-text">{s.byTargetHint}</p>
      {logs.length > 0 && (
        <details>
          <summary className="small-text">
            {s.logged} ({logs.length})
          </summary>
          <ul className="log-list small-text">
            {logs.map((l) => (
              <li key={l.id}>
                {date(l.date)} · <strong>{formatHours(l.hours)}</strong> · {labelOf(l)}
                {l.note && <span className="muted"> · {l.note}</span>}{' '}
                <button className="link danger" aria-label={t.common.delete} onClick={() => confirm(s.confirmDeleteLog) && repo.deleteStudyLog(l.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

// ---------- this week's study tasks ----------

function StudyTasksCard({ subjectId, cycle, week, tasks }: { subjectId: string; cycle: Cycle; week: number; tasks: Task[] }) {
  const { t } = useI18n()
  const s = t.students
  const goals = useGoals(cycle.id)
  const tactics = useTactics(cycle.id)
  const [title, setTitle] = useState('')
  const [tactic, setTactic] = useState<string | null>(null)

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    void repo.createTask({ cycle_id: cycle.id, week_number: week, title: title.trim(), tactic_id: tactic, subject_id: subjectId })
    setTitle('')
  }

  return (
    <div className="card stack">
      <h2>{s.tasks}</h2>
      <form className="row" onSubmit={add}>
        <input className="grow" placeholder={s.taskPlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} />
        <TacticSelect goals={goals} tactics={tactics} value={tactic} onChange={setTactic} />
      </form>
      {tasks.length === 0 ? (
        <p className="muted">{s.noTasks}</p>
      ) : (
        <ul className="task-list">
          {tasks.map((x) => (
            <TaskRow
              key={x.id}
              task={x}
              readOnly={isBlock(x, tactics)}
              context={tacticLabel(x.tactic_id, goals, tactics, t.common.other)}
              minimum={minimumOf(x.tactic_id, tactics)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
