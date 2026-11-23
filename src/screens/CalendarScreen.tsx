// Calendar: week view (hours, Monday → Sunday) and month view.
//
// Shows two kinds of things:
//   - EVENTS: classes, exams, meetings… (optionally repeating every week)
//   - TASKS of the current cycle that have a date (and a time, to appear as a
//     block). Blocks are coloured by goal; done tasks are faded with a ✓.
// Click an empty slot to add an event or place a task there; click a block to
// change it. The address remembers the view: #/calendar?view=month&date=…
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useCycleTasks, useGoals, useTactics } from '../data/hooks'
import { useLive } from '../data/useLive'
import type { CalendarEvent, Cycle, Goal, ISODate, Tactic, Task } from '../data/types'
import { useI18n } from '../i18n'
import Modal from '../components/Modal'
import NumberField from '../components/NumberField'
import { minimumOf, tacticLabel } from '../components/TacticSelect'
import StatusButtons from '../components/StatusButtons'
import { EVENT_COLOR, eventColorOf, goalColorOf } from '../components/colors'
import ColorPicker from '../components/ColorPicker'
import {
  addMonths,
  calendarItems,
  DEFAULT_BLOCK_MINUTES,
  fromMinutes,
  isValidTime,
  layoutDay,
  monthGrid,
  toMinutes,
  type CalendarItem,
} from '../logic/calendar'
import { addDays, formatWeekday, isValidDate, todayISO, weekDates, weekNumberOf, weekStart } from '../logic/weeks'

/** Height of one hour in the week view, in pixels. */
const HOUR_PX = 48
/** Hours shown by default (widened automatically if something is earlier/later). */
const DAY_START_HOUR = 7
const DAY_END_HOUR = 23
const OTHER_COLOR = '#94a3b8'

type Dialog =
  | { kind: 'new'; date: ISODate; time: string }
  | { kind: 'event'; event: CalendarEvent | null; date: ISODate; time: string | null }
  | { kind: 'task'; task: Task; date: ISODate; time: string }

export default function CalendarScreen() {
  const { t, locale, date: fmtDate } = useI18n()
  const c = t.calendar
  const today = todayISO()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'month' ? 'month' : 'week'
  const raw = params.get('date') ?? ''
  const date = isValidDate(raw) ? raw : today
  const go = (v: 'week' | 'month', d: ISODate) => setParams({ view: v, date: d }, { replace: true })

  const cycle = useActiveCycle() ?? null
  const goals = useGoals(cycle?.id)
  const tactics = useTactics(cycle?.id)
  const tasks = useCycleTasks(cycle?.id)
  const events = useLive(repo.listEvents, [], [] as CalendarEvent[])
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const goalColorById = new Map(goals.map((g, i) => [g.id, goalColorOf(g, i)]))
  const tacticGoal = new Map(tactics.map((x) => [x.id, x.goal_id]))
  const colorOf = (item: CalendarItem): string => {
    if (item.kind === 'event') return eventColorOf(item.event!)
    const goalId = item.task?.tactic_id ? tacticGoal.get(item.task.tactic_id) : undefined
    return (goalId !== undefined && goalColorById.get(goalId)) || OTHER_COLOR
  }
  const openItem = (item: CalendarItem) =>
    item.kind === 'event'
      ? setDialog({ kind: 'event', event: item.event!, date: item.date, time: item.event!.start_time })
      : setDialog({ kind: 'task', task: item.task!, date: item.date, time: item.task!.start_time ?? '09:00' })

  const days = weekDates(date)
  const grid = monthGrid(date)
  const rawLabel =
    view === 'week'
      ? `${fmtDate(days[0])} – ${fmtDate(days[6])}`
      : new Date(`${date.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  // Capital first letter only ("noviembre de 2026" → "Noviembre de 2026").
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
  const step = (n: number) => go(view, view === 'week' ? addDays(date, 7 * n) : addMonths(date, n))

  // Tasks of the cycle week shown, that aren't in the calendar at a time yet.
  const cycleWeek = cycle ? weekNumberOf(cycle, days[0]) : 0
  const inCycle = cycle !== null && cycleWeek >= 1 && cycleWeek <= cycle.length_weeks
  const unplaced = inCycle ? tasks.filter((x) => x.week_number === cycleWeek && !(x.planned_date && x.start_time)) : []

  return (
    <section className="stack calendar">
      <div className="row spread">
        <h1>{c.title}</h1>
        <div className="row">
          <div className="tabs compact" role="tablist">
            <button role="tab" aria-selected={view === 'week'} className={view === 'week' ? 'tab on' : 'tab'} onClick={() => go('week', date)}>
              {c.week}
            </button>
            <button role="tab" aria-selected={view === 'month'} className={view === 'month' ? 'tab on' : 'tab'} onClick={() => go('month', date)}>
              {c.month}
            </button>
          </div>
        </div>
      </div>
      <div className="row">
        <button className="btn" aria-label={c.prev} onClick={() => step(-1)}>
          ‹
        </button>
        <button className="btn" onClick={() => go(view, today)}>
          {c.today}
        </button>
        <button className="btn" aria-label={c.next} onClick={() => step(1)}>
          ›
        </button>
        <strong className="cal-label">{label}</strong>
      </div>

      {view === 'week' ? (
        <>
          {!inCycle && cycle && <p className="muted small-text">{c.outsideCycle}</p>}
          <WeekView
            days={days}
            today={today}
            items={calendarItems(events, tasks, days[0], days[6])}
            colorOf={colorOf}
            onItem={openItem}
            onSlot={(d, time) => setDialog({ kind: 'new', date: d, time })}
          />
          <p className="muted small-text">
            {c.clickSlot} <Link to="/data?action=ics">{c.importIcs}</Link>
          </p>
          <Legend goals={goals} hasEvents={events.length > 0} />
          {inCycle && (
            <div className="card">
              <h2>{c.unscheduled(unplaced.length)}</h2>
              {unplaced.length === 0 ? (
                <p className="muted">{c.allPlaced}</p>
              ) : (
                <>
                  <p className="muted small-text">{c.unscheduledHint}</p>
                  <div className="row">
                    {unplaced.map((task) => (
                      <button
                        key={task.id}
                        className="chip"
                        style={{ borderLeft: `4px solid ${colorOf({ kind: 'task', task } as CalendarItem)}` }}
                        onClick={() =>
                          setDialog({ kind: 'task', task, date: task.planned_date ?? (days.includes(today) ? today : days[0]), time: '09:00' })
                        }
                      >
                        {task.status === 'done' ? '✓ ' : ''}
                        {task.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <MonthView
          grid={grid}
          month={date.slice(0, 7)}
          today={today}
          items={calendarItems(events, tasks, grid[0], grid[41])}
          colorOf={colorOf}
          onDay={(d) => go('week', d)}
        />
      )}
      {view === 'month' && <Legend goals={goals} hasEvents={events.length > 0} />}

      {dialog?.kind === 'new' && (
        <Modal title={c.newAt(`${fmtDate(dialog.date)} · ${dialog.time}`)} onClose={() => setDialog(null)}>
          <button className="btn primary" onClick={() => setDialog({ kind: 'event', event: null, date: dialog.date, time: dialog.time })}>
            + {c.newEvent}
          </button>
          <h3>{c.placeTask}</h3>
          {(() => {
            const wk = cycle ? weekNumberOf(cycle, dialog.date) : 0
            const options = tasks.filter((x) => x.week_number === wk && !(x.planned_date && x.start_time))
            return options.length === 0 ? (
              <p className="muted">{c.noTasksToPlace}</p>
            ) : (
              <div className="row">
                {options.map((task) => (
                  <button key={task.id} className="chip" onClick={() => setDialog({ kind: 'task', task, date: dialog.date, time: dialog.time })}>
                    {task.title}
                  </button>
                ))}
              </div>
            )
          })()}
        </Modal>
      )}
      {dialog?.kind === 'event' && (
        <EventDialog event={dialog.event} date={dialog.date} time={dialog.time} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'task' && cycle && (
        <TaskDialog
          key={dialog.task.id}
          task={tasks.find((x) => x.id === dialog.task.id) ?? dialog.task}
          cycle={cycle}
          goals={goals}
          tactics={tactics}
          date={dialog.date}
          time={dialog.time}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  )
}

// ---------- legend ----------

/** What each colour means. Goal colours can be changed in Goals. */
function Legend({ goals, hasEvents }: { goals: Goal[]; hasEvents: boolean }) {
  const { t } = useI18n()
  return (
    <div className="legend small-text">
      {goals.map((g, i) => (
        <span key={g.id} className="legend-item">
          <span className="swatch" style={{ background: goalColorOf(g, i) }} /> {g.name}
        </span>
      ))}
      <span className="legend-item">
        <span className="swatch" style={{ background: OTHER_COLOR }} /> {t.common.other}
      </span>
      {hasEvents && (
        <span className="legend-item">
          <span className="swatch striped" style={{ background: EVENT_COLOR }} /> {t.calendar.eventsLegend}
        </span>
      )}
      <Link to="/goals" className="muted">
        {t.calendar.changeColors}
      </Link>
    </div>
  )
}

// ---------- week view ----------

function WeekView({
  days,
  today,
  items,
  colorOf,
  onItem,
  onSlot,
}: {
  days: ISODate[]
  today: ISODate
  items: CalendarItem[]
  colorOf: (i: CalendarItem) => string
  onItem: (i: CalendarItem) => void
  onSlot: (date: ISODate, time: string) => void
}) {
  const { t, locale } = useI18n()
  const timed = items.filter((i) => i.start !== null) as (CalendarItem & { start: number; end: number })[]
  const startHour = Math.min(DAY_START_HOUR, ...timed.map((i) => Math.floor(i.start / 60)))
  const endHour = Math.max(DAY_END_HOUR, ...timed.map((i) => Math.ceil(i.end / 60)))
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const height = hours.length * HOUR_PX
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const clickSlot = (e: React.MouseEvent<HTMLDivElement>, day: ISODate) => {
    if (e.target !== e.currentTarget) return // clicked a block, not the background
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const minutes = startHour * 60 + Math.floor((y / HOUR_PX) * 2) * 30 // half-hour steps
    onSlot(day, fromMinutes(minutes))
  }

  return (
    <div className="week-scroll">
      <div className="week-grid">
        {/* header row */}
        <div className="wk-corner" />
        {days.map((d) => (
          <div key={d} className={d === today ? 'wk-head today' : 'wk-head'}>
            <span>{formatWeekday(d, locale, 'short')}</span> <strong>{Number(d.slice(8))}</strong>
          </div>
        ))}
        {/* all-day row */}
        <div className="wk-allday-label">{t.calendar.allDay}</div>
        {days.map((d) => (
          <div key={d} className="wk-allday">
            {items
              .filter((i) => i.date === d && i.start === null)
              .map((i) => (
                <ItemButton key={i.key} item={i} color={colorOf(i)} onClick={() => onItem(i)} compact />
              ))}
          </div>
        ))}
        {/* hours */}
        <div className="wk-hours" style={{ height }}>
          {hours.map((h) => (
            <div key={h} className="wk-hour" style={{ height: HOUR_PX }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {days.map((d) => {
          const dayItems = timed.filter((i) => i.date === d)
          const lanes = layoutDay(dayItems.map((i) => ({ key: i.key, start: i.start, end: i.end })))
          return (
            <div
              key={d}
              className={d === today ? 'wk-col today' : 'wk-col'}
              style={{ height, backgroundSize: `100% ${HOUR_PX}px` }}
              onClick={(e) => clickSlot(e, d)}
            >
              {dayItems.map((i) => {
                const lane = lanes.get(i.key)!
                return (
                  <ItemButton
                    key={i.key}
                    item={i}
                    color={colorOf(i)}
                    onClick={() => onItem(i)}
                    style={{
                      top: ((i.start - startHour * 60) / 60) * HOUR_PX,
                      height: Math.max(20, ((i.end - i.start) / 60) * HOUR_PX - 2),
                      left: `${(lane.lane / lane.lanes) * 100}%`,
                      width: `calc(${100 / lane.lanes}% - 2px)`,
                    }}
                  />
                )
              })}
              {d === today && nowMin >= startHour * 60 && nowMin <= endHour * 60 && (
                <div className="now-line" style={{ top: ((nowMin - startHour * 60) / 60) * HOUR_PX }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ItemButton({
  item,
  color,
  onClick,
  style,
  compact,
}: {
  item: CalendarItem
  color: string
  onClick: () => void
  style?: React.CSSProperties
  compact?: boolean
}) {
  const title = item.kind === 'event' ? item.event!.title : item.task!.title
  const status = item.task?.status
  const time = item.start !== null ? `${fromMinutes(item.start)}–${fromMinutes(item.end!)}` : ''
  return (
    <button
      className={`cal-item ${item.kind}${status ? ` status-${status}` : ''}${compact ? ' compact' : ''}`}
      style={{ ...style, background: color, borderColor: color }}
      title={`${time} ${title}`.trim()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <span className="cal-item-title">
        {status === 'done' ? '✓ ' : status === 'partial' ? '½ ' : status === 'missed' ? '✗ ' : ''}
        {item.event?.repeat_weekly ? '↻ ' : ''}
        {title}
      </span>
      {!compact && time && <span className="cal-item-time">{time}</span>}
    </button>
  )
}

// ---------- month view ----------

function MonthView({
  grid,
  month,
  today,
  items,
  colorOf,
  onDay,
}: {
  grid: ISODate[]
  month: string
  today: ISODate
  items: CalendarItem[]
  colorOf: (i: CalendarItem) => string
  onDay: (d: ISODate) => void
}) {
  const { t, locale } = useI18n()
  const MAX = 3
  return (
    <div className="month-grid">
      {grid.slice(0, 7).map((d) => (
        <div key={`h${d}`} className="month-head">
          {formatWeekday(d, locale, 'short')}
        </div>
      ))}
      {grid.map((d) => {
        const dayItems = items.filter((i) => i.date === d)
        return (
          <button
            key={d}
            className={`month-cell${d.startsWith(month) ? '' : ' out'}${d === today ? ' today' : ''}`}
            onClick={() => onDay(d)}
          >
            <span className="month-day">{Number(d.slice(8))}</span>
            {dayItems.slice(0, MAX).map((i) => (
              <span key={i.key} className={`month-item${i.task?.status === 'done' ? ' done' : ''}`}>
                <span className="dot-color" style={{ background: colorOf(i) }} />
                {i.start !== null && <span className="muted">{fromMinutes(i.start)} </span>}
                {i.kind === 'event' ? i.event!.title : i.task!.title}
              </span>
            ))}
            {dayItems.length > MAX && <span className="muted small-text">{t.calendar.more(dayItems.length - MAX)}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ---------- event dialog ----------

function EventDialog({ event, date, time, onClose }: { event: CalendarEvent | null; date: ISODate; time: string | null; onClose: () => void }) {
  const { t } = useI18n()
  const c = t.calendar
  const start = time ?? '09:00'
  const [f, setF] = useState<repo.NewEvent>(
    event ?? {
      title: '',
      date,
      start_time: start,
      end_time: fromMinutes(toMinutes(start) + DEFAULT_BLOCK_MINUTES),
      repeat_weekly: false,
      repeat_until: null,
      notes: '',
    },
  )
  const [error, setError] = useState('')
  const set = (patch: Partial<repo.NewEvent>) => setF({ ...f, ...patch })
  const allDay = f.start_time === null

  const save = async () => {
    if (!f.title.trim()) return setError(c.needTitle)
    if (!allDay && (!f.start_time || !f.end_time || !isValidTime(f.start_time) || !isValidTime(f.end_time) || f.end_time <= f.start_time)) {
      return setError(c.endBeforeStart)
    }
    const data = { ...f, title: f.title.trim(), repeat_until: f.repeat_weekly ? f.repeat_until || null : null }
    if (event) await repo.updateEvent(event.id, data)
    else await repo.createEvent(data)
    onClose()
  }
  const remove = async () => {
    if (event && confirm(c.confirmDeleteEvent(event.title))) {
      await repo.deleteEvent(event.id)
      onClose()
    }
  }

  return (
    <Modal title={event ? c.editEvent : c.newEvent} onClose={onClose}>
      <label className="field">
        <span>{c.titleField}</span>
        <input autoFocus value={f.title} placeholder={c.eventPlaceholder} onChange={(e) => set({ title: e.target.value })} />
      </label>
      <div className="row">
        <label className="field">
          <span>{c.date}</span>
          <input type="date" value={f.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
        </label>
        {!allDay && (
          <>
            <label className="field">
              <span>{c.start}</span>
              <input type="time" step={900} value={f.start_time ?? ''} onChange={(e) => set({ start_time: e.target.value })} />
            </label>
            <label className="field">
              <span>{c.end}</span>
              <input type="time" step={900} value={f.end_time ?? ''} onChange={(e) => set({ end_time: e.target.value })} />
            </label>
          </>
        )}
      </div>
      <label className="row">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) =>
            set(e.target.checked ? { start_time: null, end_time: null } : { start_time: start, end_time: fromMinutes(toMinutes(start) + 60) })
          }
        />
        {c.allDayCheck}
      </label>
      <div className="row">
        <label className="row">
          <input type="checkbox" checked={f.repeat_weekly} onChange={(e) => set({ repeat_weekly: e.target.checked })} />
          {c.repeatWeekly}
        </label>
        {f.repeat_weekly && (
          <label className="field">
            <span>{c.until}</span>
            <input type="date" min={f.date} value={f.repeat_until ?? ''} onChange={(e) => set({ repeat_until: e.target.value || null })} />
          </label>
        )}
      </div>
      {event?.repeat_weekly && <p className="muted small-text">↻ {c.repeatsNote}</p>}
      <label className="field">
        <span>{c.notes}</span>
        <input value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
      <div className="field">
        <span>{c.color}</span>
        <ColorPicker
          value={f.color ?? null}
          auto={EVENT_COLOR}
          label={c.color}
          autoLabel={c.autoColor}
          onChange={(color) => set({ color })}
        />
      </div>
      {error && <p className="bad">{error}</p>}
      <div className="row spread">
        <div className="row">
          <button className="btn primary" onClick={save}>
            {t.common.save}
          </button>
          <button className="btn" onClick={onClose}>
            {t.common.cancel}
          </button>
        </div>
        {event && (
          <button className="link danger" onClick={remove}>
            {t.common.delete}
          </button>
        )}
      </div>
    </Modal>
  )
}

// ---------- task dialog (place / move / tick a task) ----------

function TaskDialog({
  task,
  cycle,
  goals,
  tactics,
  date,
  time,
  onClose,
}: {
  task: Task
  cycle: Cycle
  goals: Goal[]
  tactics: Tactic[]
  date: ISODate
  time: string
  onClose: () => void
}) {
  const { t, date: fmtDate } = useI18n()
  const c = t.calendar
  // A task must stay inside its own cycle week.
  const weekDays = weekDates(weekStart(cycle, task.week_number))
  const [day, setDay] = useState(weekDays.includes(date) ? date : weekDays[0])
  const [start, setStart] = useState(task.start_time ?? time)
  const [hours, setHours] = useState<number | null>(task.planned_hours ?? DEFAULT_BLOCK_MINUTES / 60)
  const [error, setError] = useState('')

  const save = async () => {
    if (!isValidTime(start)) return setError(c.endBeforeStart)
    await repo.updateTask(task.id, { planned_date: day, start_time: start, planned_hours: hours })
    onClose()
  }
  const unschedule = async () => {
    await repo.updateTask(task.id, { planned_date: null, start_time: null })
    onClose()
  }

  return (
    <Modal title={task.title} onClose={onClose}>
      <p className="muted small-text">{tacticLabel(task.tactic_id, goals, tactics, t.common.other)}</p>
      <div className="row">
        <StatusButtons task={task} minimum={minimumOf(task.tactic_id, tactics)} />
        {task.status === 'todo' && (
          <Link className="btn" to={`/focus?task=${task.id}`}>
            ▶ {t.nav.focus}
          </Link>
        )}
        <Link className="small-text" to={`/tasks?week=${task.week_number}`}>
          {c.openInTasks}
        </Link>
      </div>
      <div className="row">
        <label className="field">
          <span>{c.date}</span>
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            {weekDays.map((d) => (
              <option key={d} value={d}>
                {fmtDate(d)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{c.start}</span>
          <input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          <span>{c.duration}</span>
          <NumberField className="num small" value={hours} placeholder="1" onChange={setHours} />
        </label>
      </div>
      {error && <p className="bad">{error}</p>}
      <div className="row spread">
        <div className="row">
          <button className="btn primary" onClick={save}>
            {t.common.save}
          </button>
          <button className="btn" onClick={onClose}>
            {t.common.cancel}
          </button>
        </div>
        {task.start_time && (
          <button className="link" onClick={unschedule}>
            {c.unschedule}
          </button>
        )}
      </div>
    </Modal>
  )
}
