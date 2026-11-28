// Calendar: week view (hours, Monday → Sunday) and month view.
//
// Shows two kinds of things:
//   - EVENTS: classes, exams, meetings… (optionally repeating every week)
//   - TASKS of the current cycle that have a date (and a time, to appear as a
//     block). Blocks are coloured by goal; done tasks are faded with a ✓.
// Click an empty slot to add an event or place a task there; click a block to
// change it. The address remembers the view: #/calendar?view=month&date=…
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCalendarEvents } from '../components/useCalendarEvents'
import * as repo from '../data/repo'
import { useActiveCycle, useCycleTasks, useGoals, useTactics } from '../data/hooks'
import type { CalendarEvent, Cycle, EventCategory, Goal, ISODate, Tactic, Task } from '../data/types'
import { useI18n } from '../i18n'
import Modal from '../components/Modal'
import NumberField from '../components/NumberField'
import { minimumOf, tacticLabel } from '../components/TacticSelect'
import StatusButtons, { StatusBadge } from '../components/StatusButtons'
import { isBlock } from '../logic/taskActions'
import SubjectSelect from '../components/SubjectSelect'
import StudyTargetSelect from '../components/StudyTargetSelect'
import CausePicker from '../components/CausePicker'
import { EVENT_COLOR, eventColorOf, goalColorOf, PICKER_COLORS } from '../components/colors'
import ColorPicker from '../components/ColorPicker'
import TextField from '../components/TextField'
import BlockTasks, { blockBadge } from '../components/BlockTasks'
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
import { DateInput, TimeInput } from '../components/DateTimeInput'

/** Height of one hour in the week view, in pixels. */
const HOUR_PX = 48
/** Hours shown by default (widened automatically if something is earlier/later). */
const DAY_START_HOUR = 7
const DAY_END_HOUR = 23
const OTHER_COLOR = '#94a3b8'

type Dialog =
  | { kind: 'new'; date: ISODate; time: string }
  | {
      kind: 'event'
      event: CalendarEvent | null
      date: ISODate
      time: string | null
    }
  | { kind: 'task'; task: Task; date: ISODate; time: string }
  | { kind: 'categories' }

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
  const { events, categories, subjectOfEvent } = useCalendarEvents()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const goalColorById = new Map(goals.map((g, i) => [g.id, goalColorOf(g, i)]))
  const tacticGoal = new Map(tactics.map((x) => [x.id, x.goal_id]))
  const colorOf = (item: CalendarItem): string => {
    if (item.kind === 'event') return eventColorOf(item.event!)
    const goalId = item.task?.tactic_id ? tacticGoal.get(item.task.tactic_id) : undefined
    return (goalId !== undefined && goalColorById.get(goalId)) || OTHER_COLOR
  }
  const openItem = (item: CalendarItem) => {
    // An exam opens its subject (exams are edited in Studies).
    const subjectId = item.kind === 'event' ? subjectOfEvent(item.event!.id) : null
    if (subjectId) return navigate(`/students/${subjectId}`)
    return item.kind === 'event'
      ? setDialog({
          kind: 'event',
          event: item.event!,
          date: item.date,
          time: item.event!.start_time,
        })
      : setDialog({
          kind: 'task',
          task: item.task!,
          date: item.date,
          time: item.task!.start_time ?? '09:00',
        })
  }

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
  // Tasks inside a block are shown by the block (☑ 1/2), not on their own.
  const ids = new Set(tasks.map((x) => x.id))
  const shown = tasks.filter((x) => !(x.block_id && ids.has(x.block_id)))
  const unplaced = inCycle ? shown.filter((x) => x.week_number === cycleWeek && !(x.planned_date && x.start_time)) : []

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
            items={calendarItems(events, shown, days[0], days[6])}
            colorOf={colorOf}
            badgeOf={(i) => (i.task ? blockBadge(i.task.id, tasks) : '')}
            onItem={openItem}
            onSlot={(d, time) => setDialog({ kind: 'new', date: d, time })}
          />
          <p className="muted small-text">
            {c.clickSlot} <Link to="/data?action=ics">{c.importIcs}</Link>
          </p>
          <Legend goals={goals} categories={categories} events={events} onEdit={() => setDialog({ kind: 'categories' })} />
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
                        style={{
                          borderLeft: `4px solid ${colorOf({ kind: 'task', task } as CalendarItem)}`,
                        }}
                        onClick={() =>
                          setDialog({
                            kind: 'task',
                            task,
                            date: task.planned_date ?? (days.includes(today) ? today : days[0]),
                            time: '09:00',
                          })
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
          items={calendarItems(events, shown, grid[0], grid[41])}
          colorOf={colorOf}
          onDay={(d) => go('week', d)}
        />
      )}
      {view === 'month' && <Legend goals={goals} categories={categories} events={events} onEdit={() => setDialog({ kind: 'categories' })} />}

      {dialog?.kind === 'new' && (
        <Modal title={c.newAt(`${fmtDate(dialog.date)} · ${dialog.time}`)} onClose={() => setDialog(null)}>
          <button
            className="btn primary"
            onClick={() =>
              setDialog({
                kind: 'event',
                event: null,
                date: dialog.date,
                time: dialog.time,
              })
            }
          >
            + {c.newEvent}
          </button>
          <h3>{c.placeTask}</h3>
          {(() => {
            const wk = cycle ? weekNumberOf(cycle, dialog.date) : 0
            const options = shown.filter((x) => x.week_number === wk && !(x.planned_date && x.start_time))
            return options.length === 0 ? (
              <p className="muted">{c.noTasksToPlace}</p>
            ) : (
              <div className="row">
                {options.map((task) => (
                  <button
                    key={task.id}
                    className="chip"
                    onClick={() =>
                      setDialog({
                        kind: 'task',
                        task,
                        date: dialog.date,
                        time: dialog.time,
                      })
                    }
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            )
          })()}
        </Modal>
      )}
      {dialog?.kind === 'event' && (
        <EventDialog event={dialog.event} date={dialog.date} time={dialog.time} categories={categories} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'categories' && <CategoriesDialog categories={categories} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'task' && cycle && (
        <TaskDialog
          key={dialog.task.id}
          task={tasks.find((x) => x.id === dialog.task.id) ?? dialog.task}
          cycle={cycle}
          goals={goals}
          tactics={tactics}
          tasks={tasks}
          date={dialog.date}
          time={dialog.time}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  )
}

// ---------- legend ----------

/** What each colour means: goals (for tasks) and your event categories. */
function Legend({ goals, categories, events, onEdit }: { goals: Goal[]; categories: EventCategory[]; events: CalendarEvent[]; onEdit: () => void }) {
  const { t } = useI18n()
  // Events without a category (exams included) are listed together.
  const loose = events.some((e) => !e.category_id || !categories.some((c) => c.id === e.category_id))
  return (
    <div className="stack-tight">
      <div className="legend small-text">
        <span className="muted">{t.calendar.legendTasks}</span>
        {goals.map((g, i) => (
          <span key={g.id} className="legend-item">
            <span className="swatch" style={{ background: goalColorOf(g, i) }} /> {g.name}
          </span>
        ))}
        <span className="legend-item">
          <span className="swatch" style={{ background: OTHER_COLOR }} /> {t.common.other}
        </span>
        <Link to="/goals" className="muted">
          {t.calendar.changeColors}
        </Link>
      </div>
      <div className="legend small-text">
        <span className="muted">{t.calendar.legendEvents}</span>
        {categories.map((c) => (
          <span key={c.id} className="legend-item">
            <span className="swatch striped" style={{ background: c.color }} /> {c.name}
          </span>
        ))}
        {loose && (
          <span className="legend-item">
            <span className="swatch striped" style={{ background: EVENT_COLOR }} /> {categories.length ? t.calendar.noCategory : t.calendar.eventsLegend}
          </span>
        )}
        <span className="muted">🚩 {t.calendar.kinds.deadline}</span>
        <button className="link" onClick={onEdit}>
          {t.calendar.editCategories}
        </button>
      </div>
    </div>
  )
}

// ---------- colour categories dialog ----------

/** Create, rename, recolour and delete the event categories (e.g. Uni, Gym). */
function CategoriesDialog({ categories, onClose }: { categories: EventCategory[]; onClose: () => void }) {
  const { t } = useI18n()
  const c = t.calendar
  const [name, setName] = useState('')
  const add = async () => {
    if (!name.trim()) return
    const used = new Set(categories.map((x) => x.color))
    await repo.createCategory(name.trim(), PICKER_COLORS.find((col) => !used.has(col)) ?? PICKER_COLORS[0])
    setName('')
  }
  const remove = async (cat: EventCategory) => {
    if (confirm(c.confirmDeleteCategory(cat.name))) await repo.deleteCategory(cat.id)
  }
  return (
    <Modal title={c.categoriesTitle} onClose={onClose}>
      <p className="muted small-text">{c.categoriesHint}</p>
      {categories.map((cat) => (
        <div key={cat.id} className="category-row stack-tight">
          <div className="row spread">
            <TextField className="grow" ariaLabel={c.categoryName} value={cat.name} required onSave={(n) => repo.updateCategory(cat.id, { name: n })} />
            <button className="link danger" onClick={() => remove(cat)}>
              {t.common.delete}
            </button>
          </div>
          <ColorPicker
            value={cat.color}
            auto={cat.color}
            label={c.color}
            autoLabel={c.color}
            hideAuto
            onChange={(color) => color && repo.updateCategory(cat.id, { color })}
          />
        </div>
      ))}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input className="grow" value={name} placeholder={c.categoryPlaceholder} aria-label={c.categoryName} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary" type="submit">
          + {c.addCategory}
        </button>
      </form>
      <div className="row">
        <button className="btn" onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </Modal>
  )
}

// ---------- week view ----------

function WeekView({
  days,
  today,
  items,
  colorOf,
  badgeOf,
  onItem,
  onSlot,
}: {
  days: ISODate[]
  today: ISODate
  items: CalendarItem[]
  colorOf: (i: CalendarItem) => string
  badgeOf: (i: CalendarItem) => string
  onItem: (i: CalendarItem) => void
  onSlot: (date: ISODate, time: string) => void
}) {
  const { t, locale } = useI18n()
  const timed = items.filter((i) => i.start !== null) as (CalendarItem & {
    start: number
    end: number
  })[]
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
                <ItemButton key={i.key} item={i} color={colorOf(i)} badge={badgeOf(i)} onClick={() => onItem(i)} compact />
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
                    badge={badgeOf(i)}
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
  badge,
}: {
  item: CalendarItem
  color: string
  /** e.g. "☑ 1/2" for a block with tasks inside. */
  badge?: string
  onClick: () => void
  style?: React.CSSProperties
  compact?: boolean
}) {
  const title = item.kind === 'event' ? item.event!.title : item.task!.title
  const status = item.task?.status
  const time = item.start !== null ? `${fromMinutes(item.start)}–${fromMinutes(item.end!)}` : ''
  return (
    <button
      className={`cal-item ${item.kind}${item.event?.kind === 'deadline' ? ' deadline' : ''}${status ? ` status-${status}` : ''}${compact ? ' compact' : ''}`}
      style={{ ...style, background: color, borderColor: color }}
      title={`${time} ${title}`.trim()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <span className="cal-item-title">
        {status === 'done' ? '✓ ' : status === 'partial' ? '½ ' : status === 'missed' ? '✗ ' : ''}
        {item.event?.kind === 'deadline' ? '🚩 ' : ''}
        {item.event?.repeat_weekly ? '↻ ' : ''}
        {title}
        {badge ? <span className="cal-item-badge"> {badge}</span> : null}
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
          <button key={d} className={`month-cell${d.startsWith(month) ? '' : ' out'}${d === today ? ' today' : ''}`} onClick={() => onDay(d)}>
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

function EventDialog({
  event,
  date,
  time,
  categories,
  onClose,
}: {
  event: CalendarEvent | null
  date: ISODate
  time: string | null
  categories: EventCategory[]
  onClose: () => void
}) {
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
      kind: 'other',
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
    const data = {
      ...f,
      title: f.title.trim(),
      repeat_until: f.repeat_weekly ? f.repeat_until || null : null,
    }
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
          <DateInput value={f.date} onChange={(v) => v && set({ date: v })} />
        </label>
        {!allDay && (
          <>
            <label className="field">
              <span>{c.start}</span>
              <TimeInput value={f.start_time ?? ''} onChange={(v) => set({ start_time: v })} />
            </label>
            <label className="field">
              <span>{c.end}</span>
              <TimeInput value={f.end_time ?? ''} onChange={(v) => set({ end_time: v })} />
            </label>
          </>
        )}
      </div>
      <label className="row">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) =>
            set(
              e.target.checked
                ? { start_time: null, end_time: null }
                : {
                    start_time: start,
                    end_time: fromMinutes(toMinutes(start) + 60),
                  },
            )
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
            <DateInput min={f.date} value={f.repeat_until ?? ''} onChange={(v) => set({ repeat_until: v || null })} />
          </label>
        )}
      </div>
      {event?.repeat_weekly && <p className="muted small-text">↻ {c.repeatsNote}</p>}
      <label className="field">
        <span>{c.notes}</span>
        <input value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
      <div className="field">
        <span>{c.kindLabel}</span>
        <div className="seg">
          {(['class', 'deadline', 'other'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={(f.kind ?? 'other') === k ? 'on' : undefined}
              aria-pressed={(f.kind ?? 'other') === k}
              onClick={() => set({ kind: k })}
            >
              {c.kinds[k]}
            </button>
          ))}
        </div>
        <span className="muted small-text">{c.kindHint}</span>
      </div>
      {categories.length > 0 && (
        <div className="field">
          <span>{c.category}</span>
          <div className="row">
            {[null, ...categories].map((cat) => {
              const on = (f.category_id ?? null) === (cat?.id ?? null)
              return (
                <button
                  key={cat?.id ?? 'none'}
                  type="button"
                  className={on ? 'chip on' : 'chip'}
                  aria-pressed={on}
                  onClick={() => set(cat ? { category_id: cat.id, color: cat.color } : { category_id: null })}
                >
                  {cat && <span className="dot-color" style={{ background: cat.color }} />}
                  {cat ? cat.name : c.noCategory}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {!f.category_id && (
        <div className="field">
          <span>{c.color}</span>
          <ColorPicker value={f.color ?? null} auto={EVENT_COLOR} label={c.color} autoLabel={c.autoColor} onChange={(color) => set({ color })} />
        </div>
      )}
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
  tasks,
  date,
  time,
  onClose,
}: {
  task: Task
  cycle: Cycle
  goals: Goal[]
  tactics: Tactic[]
  tasks: Task[]
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
    await repo.updateTask(task.id, {
      planned_date: day,
      start_time: start,
      planned_hours: hours,
    })
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
        {isBlock(task, tactics) ? (
          <span className="row small-text">
            <StatusBadge status={task.status} />
            <Link to="/day?view=close">{t.blocks.markInClosing} →</Link>
          </span>
        ) : (
          <>
            <StatusButtons task={task} minimum={minimumOf(task.tactic_id, tactics)} />
            <CausePicker task={task} />
          </>
        )}
        {task.status === 'todo' && (
          <Link className="btn" to={`/focus?task=${task.id}`}>
            ▶ {t.nav.focus}
          </Link>
        )}
        <Link className="small-text" to={`/tasks?week=${task.week_number}`}>
          {c.openInTasks}
        </Link>
      </div>
      {isBlock(task, tactics) && <BlockTasks block={task} tasks={tasks} tactics={tactics} canAdd />}
      <div className="row">
        <SubjectSelect value={task.subject_id ?? null} onChange={(id) => repo.updateTask(task.id, { subject_id: id, topic_id: null, exam_id: null })} />
        <StudyTargetSelect
          subjectId={task.subject_id ?? null}
          value={{ topic_id: task.topic_id ?? null, exam_id: task.exam_id ?? null }}
          onChange={(target) => repo.updateTask(task.id, target)}
        />
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
          <TimeInput value={start} onChange={(v) => setStart(v)} />
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
