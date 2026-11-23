// Opening & closing: the two daily rituals in one screen.
//
// OPENING (morning): where you are (week, days left), planned or reactive,
// today's must-do, today's schedule, free time, the deadlines radar, what's
// lagging, and today's habits.
// CLOSING (night): today's tasks to mark ✓ ½ ✗ (with the cause), the day
// score, a one-line reflection, and the habits still open.
// Before 16:00 the opening is shown first, after that the closing.
import { Link, useSearchParams } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useCycleTasks, useGoals, useHabitChecks, useHabits, useTactics } from '../data/hooks'
import { useLive } from '../data/useLive'
import type { CalendarEvent, Cycle, DayEntry, FocusSession, Goal, Tactic, Task } from '../data/types'
import { useI18n } from '../i18n'
import TaskRow from '../components/TaskRow'
import StatusButtons from '../components/StatusButtons'
import { minimumOf, tacticLabel } from '../components/TacticSelect'
import { pctClass } from '../components/pctClass'
import { TodayHabits } from './HabitsPanel'
import { useNow } from '../components/FocusRunner'
import { calendarItems, fromMinutes, isValidTime, toMinutes } from '../logic/calendar'
import { busyOn, deadlinesRadar, formatMinutes, freeSlots, lagging } from '../logic/day'
import { checkSet, isPlanned, missedLastTime } from '../logic/habits'
import { executionPoints, formatHours, formatPct, isDue, weekExecution } from '../logic/metrics'
import { addDays, cycleEnd, cyclePosition, daysBetween, defaultWeek, todayISO, weekEnd } from '../logic/weeks'

/** From this hour on, the closing is shown first. */
const CLOSING_FROM_HOUR = 16

export default function DayScreen() {
  const { t, locale } = useI18n()
  const [params, setParams] = useSearchParams()
  const nowMs = useNow(60_000)
  const now = new Date(nowMs)
  const view = params.get('view') ?? (now.getHours() >= CLOSING_FROM_HOUR ? 'close' : 'open')
  const today = todayISO(now)
  const cycle = useActiveCycle()
  const entry = useLive(() => repo.getDay(today), [today], null as DayEntry | null)

  const tab = (id: 'open' | 'close', label: string) => (
    <button role="tab" aria-selected={view === id} className={view === id ? 'tab on' : 'tab'} onClick={() => setParams({ view: id }, { replace: true })}>
      {label}
    </button>
  )
  // In the app's language, capital first letter only ("Lunes, 23 de noviembre").
  const rawDate = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const longDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1)

  return (
    <section className="stack day">
      <h1>{t.day.title}</h1>
      <p className="muted day-date">{longDate}</p>
      <div className="tabs" role="tablist">
        {tab('open', `☀️ ${t.day.opening}`)}
        {tab('close', `🌙 ${t.day.closing}`)}
      </div>
      {cycle === undefined ? null : cycle === null ? (
        <p className="note">
          {t.day.noCycle} <Link to="/setup">{t.common.startNewCycle}</Link>
        </p>
      ) : view === 'close' ? (
        <Closing cycle={cycle} today={today} entry={entry} />
      ) : (
        <Opening cycle={cycle} today={today} entry={entry} nowMin={now.getHours() * 60 + now.getMinutes()} />
      )}
    </section>
  )
}

/** Data both tabs need. */
function useDayData(cycle: Cycle, today: string) {
  const goals = useGoals(cycle.id)
  const tactics = useTactics(cycle.id)
  const tasks = useCycleTasks(cycle.id)
  const week = defaultWeek(cycle, today)
  const weekTasks = tasks.filter((x) => x.week_number === week)
  return { goals, tactics, tasks, week, weekTasks }
}

// ---------- OPENING ----------

function Opening({ cycle, today, entry, nowMin }: { cycle: Cycle; today: string; entry: DayEntry | null; nowMin: number }) {
  const { t, date } = useI18n()
  const d = t.day
  const { goals, tactics, tasks, week, weekTasks } = useDayData(cycle, today)
  const events = useLive(repo.listEvents, [], [] as CalendarEvent[])
  const window = useLive(repo.getDayWindow, [], repo.DEFAULT_DAY_WINDOW)
  const habits = useHabits()
  const habitDone = checkSet(useHabitChecks(addDays(today, -8)))
  const position = cyclePosition(cycle, today)

  const items = calendarItems(events, tasks, today, today)
  const free = freeSlots(busyOn(items, today), { start: toMinutes(window.start), end: toMinutes(window.end) }, nowMin)
  const radar = deadlinesRadar(events, today)
  const exec = weekExecution(cycle, week, weekTasks, goals, tactics, today)
  const lags = lagging(goals, tactics, weekTasks, exec.byGoal, today)
  const overdue = weekTasks.filter((x) => x.status === 'todo' && isDue(x, weekEnd(cycle, week), today)).length
  const atRisk = habits.filter((h) => h.active && isPlanned(h, today) && !habitDone.has(`${h.id}|${today}`) && missedLastTime(h, habitDone, today))
  const unplaced = weekTasks.filter((x) => x.status === 'todo' && !(x.planned_date && x.start_time)).length
  const choices = [...weekTasks.filter((x) => x.status === 'todo')].sort(
    (a, b) => Number(b.planned_date === today) - Number(a.planned_date === today),
  )
  const mustDo = entry?.must_do ? tasks.find((x) => x.id === entry.must_do) : undefined
  const timeOf = (iso: string) => new Date(iso).toTimeString().slice(0, 5)

  const setWindow = (patch: Partial<{ start: string; end: string }>) => {
    const next = { ...window, ...patch }
    if (isValidTime(next.start) && isValidTime(next.end) && next.end > next.start) void repo.setSetting('dayWindow', next)
  }

  return (
    <>
      {position.phase === 'during' && (
        <p className="day-where">
          <strong>{d.weekLine(position.week, cycle.length_weeks, position.daysLeftInWeek)}</strong> · {d.cycleLeft(daysBetween(today, cycleEnd(cycle)))}
        </p>
      )}

      <div className="card stack">
        <h2>{d.modeTitle}</h2>
        <p className="muted small-text">{d.modeHint}</p>
        <div className="row">
          {(['planned', 'reactive'] as const).map((m) => (
            <button key={m} className={entry?.mode === m ? 'chip on' : 'chip'} aria-pressed={entry?.mode === m} onClick={() => repo.updateDay(today, { mode: m })}>
              {m === 'planned' ? `✅ ${d.planned}` : `⚡ ${d.reactive}`}
            </button>
          ))}
        </div>
        {entry?.mode === 'reactive' && unplaced > 0 && (
          <p className="warn small-text">
            {d.reactiveTip(unplaced)} <Link to="/calendar">{d.placeThem}</Link>
          </p>
        )}
      </div>

      <div className="card stack">
        <h2>⭐ {d.mustDoTitle}</h2>
        <p className="muted small-text">{d.mustDoHint}</p>
        <select value={entry?.must_do ?? ''} onChange={(e) => repo.updateDay(today, { must_do: e.target.value || null })}>
          <option value="">{d.mustDoNone}</option>
          {mustDo && mustDo.status !== 'todo' && <option value={mustDo.id}>{mustDo.title}</option>}
          {choices.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
              {x.planned_date === today ? ` · ${d.today}` : ''}
            </option>
          ))}
        </select>
        {mustDo && (
          <div className="row">
            <StatusButtons task={mustDo} minimum={minimumOf(mustDo.tactic_id, tactics)} />
            <span>{mustDo.title}</span>
          </div>
        )}
      </div>

      <div className="day-grid">
        <div className="card stack">
          <h2>{d.scheduleTitle}</h2>
          {items.length === 0 ? (
            <p className="muted">{d.nothingScheduled}</p>
          ) : (
            <ul className="schedule">
              {items.map((i) => {
                const past = i.end !== null && i.end <= nowMin
                const current = i.start !== null && i.end !== null && i.start <= nowMin && nowMin < i.end
                return (
                  <li key={i.key} className={past ? 'past' : current ? 'current' : undefined}>
                    <span className="schedule-time">{i.start !== null ? `${fromMinutes(i.start)}–${fromMinutes(i.end!)}` : '·'}</span>
                    <span>
                      {i.kind === 'event' ? i.event!.title : i.task!.title}
                      {current && <strong className="good"> · {d.now}</strong>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="card stack">
          <h2>{d.freeTitle}</h2>
          {free.minutes === 0 ? (
            <p className="muted">{d.noFree}</p>
          ) : (
            <>
              <p className="big-free">{d.freeLeftToday(formatMinutes(free.minutes))}</p>
              <div className="row">
                {free.slots.map((s) => (
                  <span key={s.start} className="chip static">
                    {fromMinutes(s.start)}–{fromMinutes(s.end)}
                  </span>
                ))}
              </div>
            </>
          )}
          <label className="row small-text muted">
            <span>{d.windowLabel}</span>
            <input type="time" step={900} value={window.start} onChange={(e) => setWindow({ start: e.target.value })} />
            <input type="time" step={900} value={window.end} onChange={(e) => setWindow({ end: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="card stack">
        <h2>📅 {d.deadlinesTitle}</h2>
        {radar.length === 0 ? (
          <p className="muted">{d.noDeadlines}</p>
        ) : (
          <ul className="radar">
            {radar.map((x) => (
              <li key={x.event.id} className={x.daysLeft <= 3 ? 'urgent' : x.daysLeft <= 7 ? 'soon' : undefined}>
                <span className="radar-days">{x.daysLeft === 0 ? d.today : x.daysLeft === 1 ? d.tomorrow : d.inDays(x.daysLeft)}</span>
                <span>
                  {x.event.title}
                  <span className="muted small-text">
                    {' '}
                    · {date(x.date)}
                    {x.event.start_time ? ` ${x.event.start_time}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card stack">
        <h2>⚠️ {d.laggingTitle}</h2>
        {lags.length === 0 && overdue === 0 && atRisk.length === 0 ? (
          <p className="good">{d.nothingLagging}</p>
        ) : (
          <ul className="lag-list">
            {lags.map((l) => (
              <li key={`${l.kind}-${l.goal.id}`}>
                {l.kind === 'execution'
                  ? d.lagExecution(l.goal.name, formatPct(l.pct))
                  : d.lagHours(l.goal.name, formatHours(l.actual), formatHours(l.expected), formatHours(l.target))}
              </li>
            ))}
            {overdue > 0 && (
              <li>
                <Link to={`/tasks?week=${week}`}>{d.overdue(overdue)}</Link>
              </li>
            )}
            {atRisk.length > 0 && <li>{d.habitsAtRisk(atRisk.map((h) => h.name).join(', '))}</li>}
          </ul>
        )}
      </div>

      <TodayHabits />

      <div className="row">
        {entry?.opened_at ? (
          <span className="muted">✓ {d.opened(timeOf(entry.opened_at))}</span>
        ) : (
          <button className="btn primary big" onClick={() => repo.updateDay(today, { opened_at: new Date().toISOString() })}>
            ☀️ {d.startDay}
          </button>
        )}
      </div>
    </>
  )
}

// ---------- CLOSING ----------

function Closing({ cycle, today, entry }: { cycle: Cycle; today: string; entry: DayEntry | null }) {
  const { t } = useI18n()
  const d = t.day
  const { goals, tactics, tasks, week, weekTasks } = useDayData(cycle, today)
  const focus = useLive(() => repo.listFocusSessions(today), [today], [] as FocusSession[])
  const label = (id: string | null) => tacticLabel(id, goals, tactics, t.common.other)

  const todays = tasks.filter((x) => x.planned_date === today)
  const mustDo = entry?.must_do ? tasks.find((x) => x.id === entry.must_do) : undefined
  const list = mustDo && mustDo.planned_date !== today ? [mustDo, ...todays] : todays
  const others = weekTasks.filter((x) => x.status === 'todo' && x.planned_date !== today && x.id !== mustDo?.id)

  // Day score: today's tasks that belong to a tactic.
  const scored = list.filter((x) => x.tactic_id !== null)
  const points = executionPoints({ done: scored.filter((x) => x.status === 'done').length, partial: scored.filter((x) => x.status === 'partial').length })
  const dayPct = scored.length ? points / scored.length : null
  const actual = list.reduce((s, x) => s + (x.actual_hours ?? 0), 0)
  const planned = list.reduce((s, x) => s + (x.planned_hours ?? 0), 0)
  const focusMin = focus.filter((s) => s.date === today).reduce((s, x) => s + x.minutes, 0)
  const weekPct = weekExecution(cycle, week, weekTasks, goals, tactics, today).overall.pct
  const timeOf = (iso: string) => new Date(iso).toTimeString().slice(0, 5)

  return (
    <>
      <div className="card">
        <h2>{d.todayTasks}</h2>
        {list.length === 0 ? (
          <p className="muted">{d.noTodayTasks}</p>
        ) : (
          <ul className="task-list">
            {list.map((x) => (
              <TaskRow key={x.id} task={x} context={(x.id === mustDo?.id ? '⭐ ' : '') + label(x.tactic_id)} minimum={minimumOf(x.tactic_id, tactics)} showDate={false} />
            ))}
          </ul>
        )}
        {others.length > 0 && (
          <details className="other-open">
            <summary className="small-text">{d.otherOpen(others.length)}</summary>
            <ul className="task-list">
              {others.map((x) => (
                <TaskRow key={x.id} task={x} context={label(x.tactic_id)} minimum={minimumOf(x.tactic_id, tactics)} />
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="card stack">
        <h2>{d.scoreTitle}</h2>
        <p className="big-free">
          <span className={pctClass(dayPct)}>{d.scoreDay(formatPct(dayPct), String(points), scored.length)}</span>
        </p>
        <p className="muted">
          {d.scoreHours(formatHours(actual), formatHours(planned))} · {d.scoreFocus(formatMinutes(focusMin))}
        </p>
        <p>
          <span className={pctClass(weekPct)}>{d.scoreWeek(formatPct(weekPct))}</span>
        </p>
      </div>

      <div className="card stack">
        <h2>{d.reflectionTitle}</h2>
        <textarea
          key={today + (entry ? 'x' : '')}
          className="textarea"
          rows={3}
          placeholder={d.reflectionPlaceholder}
          defaultValue={entry?.reflection ?? ''}
          onBlur={(e) => repo.updateDay(today, { reflection: e.target.value.trim() })}
        />
      </div>

      <TodayHabits />

      <div className="row">
        {entry?.closed_at ? (
          <span className="muted">🌙 {d.closed(timeOf(entry.closed_at))}</span>
        ) : (
          <button
            className="btn primary big"
            onClick={(e) => {
              // Save the reflection being typed, then close.
              const text = (e.currentTarget.closest('.day')?.querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? ''
              void repo.updateDay(today, { reflection: text.trim(), closed_at: new Date().toISOString() })
            }}
          >
            🌙 {d.closeDay}
          </button>
        )}
      </div>
    </>
  )
}

// Re-exported for Home: the must-do banner.
export function MustDoBanner({ tasks, tactics, goals }: { tasks: Task[]; tactics: Tactic[]; goals: Goal[] }) {
  const { t } = useI18n()
  const today = todayISO()
  const entry = useLive(() => repo.getDay(today), [today], null as DayEntry | null)
  const task = entry?.must_do ? tasks.find((x) => x.id === entry.must_do) : undefined
  const hour = new Date().getHours()
  return (
    <div className="must-do-banner">
      {task ? (
        <div className="row">
          <strong>⭐ {t.day.mustDoBanner}:</strong>
          <StatusButtons task={task} minimum={minimumOf(task.tactic_id, tactics)} />
          <span>{task.title}</span>
          <span className="muted small-text">{tacticLabel(task.tactic_id, goals, tactics, t.common.other)}</span>
        </div>
      ) : (
        <span />
      )}
      <Link className="btn" to={`/day?view=${hour >= CLOSING_FROM_HOUR ? 'close' : 'open'}`}>
        {hour >= CLOSING_FROM_HOUR ? `🌙 ${t.day.closingLink}` : `☀️ ${t.day.openingLink}`}
      </Link>
    </div>
  )
}
