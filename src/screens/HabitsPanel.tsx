// Habits (the "Hábitos" tab of the Tasks screen) and the "Today's habits"
// card for Home.
//
// Habits are set up the Atomic Habits way (identity + the four laws) and
// grouped by the 7 Habits of Highly Effective People. Each card shows this
// week's days to tick, the streak and this week's consistency.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as repo from '../data/repo'
import { useHabitChecks, useHabits } from '../data/hooks'
import { HABIT_CATEGORIES, type Habit, type HabitCategory } from '../data/types'
import { useI18n } from '../i18n'
import { checkSet, consistency, isPlanned, missedLastTime, streak } from '../logic/habits'
import { formatPct } from '../logic/metrics'
import { addDays, formatWeekday, todayISO, weekDates } from '../logic/weeks'
import { pctClass } from '../components/pctClass'

/** How far back ticks are loaded (enough for streaks of over a year). */
const HISTORY_DAYS = 400
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

type Draft = Omit<repo.NewHabit, 'active' | 'start_date'>
const emptyDraft = (category: HabitCategory = 'saw'): Draft => ({
  name: '',
  category,
  identity: '',
  intention: '',
  stack: '',
  attractive: '',
  two_minute: '',
  reward: '',
  days: [...ALL_DAYS],
})

/** Shared data for both the tab and the Home card. */
function useHabitData() {
  const today = todayISO()
  const habits = useHabits()
  const checks = useHabitChecks(addDays(today, -HISTORY_DAYS))
  return { today, habits, done: checkSet(checks) }
}

// ---------- the Habits tab ----------

export default function HabitsPanel() {
  const { t } = useI18n()
  const h = t.habits
  const { today, habits, done } = useHabitData()
  // null = form closed; otherwise the habit being created / edited.
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)

  const save = async (draft: Draft) => {
    if (editing?.id) await repo.updateHabit(editing.id, draft)
    else await repo.createHabit(draft, today)
    setEditing(null)
  }

  return (
    <section className="stack">
      <p className="muted">{h.intro}</p>

      {editing ? (
        <HabitForm initial={editing.draft} isNew={editing.id === null} onSave={save} onCancel={() => setEditing(null)} />
      ) : (
        <button className="btn primary big" onClick={() => setEditing({ id: null, draft: emptyDraft() })}>
          {h.newHabit}
        </button>
      )}

      {habits.length === 0 && !editing && <p className="muted">{h.empty}</p>}
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          done={done}
          today={today}
          onEdit={() => {
            const { id, active: _a, start_date: _s, sort_order: _o, created_at: _c, updated_at: _u, ...draft } = habit
            setEditing({ id, draft })
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      ))}

      {!editing && <Suggestions onPick={(draft) => setEditing({ id: null, draft })} />}
    </section>
  )
}

// ---------- one habit ----------

function HabitCard({ habit, done, today, onEdit }: { habit: Habit; done: Set<string>; today: string; onEdit: () => void }) {
  const { t, locale, date } = useI18n()
  const h = t.habits
  const days = weekDates(today)
  const week = consistency([habit], done, days[0], days[6], today)
  const warn = habit.active && isPlanned(habit, today) && missedLastTime(habit, done, today) && !done.has(`${habit.id}|${today}`)

  const remove = () => {
    if (confirm(h.confirmDelete(habit.name))) repo.deleteHabit(habit.id)
  }

  return (
    <div className={habit.active ? 'card habit-card' : 'card habit-card paused'}>
      <div className="row spread">
        <div>
          <strong className="habit-name">{habit.name}</strong>{' '}
          <span className="badge">{h.categories[habit.category].name}</span>
          {!habit.active && <span className="badge">{h.paused}</span>}
        </div>
        <span className="muted small-text">
          {h.streak(streak(habit, done, today))} ·{' '}
          <span className={pctClass(week.pct)}>{h.weekPct(formatPct(week.pct))}</span>
        </span>
      </div>
      {habit.identity && <p className="identity">“{habit.identity}”</p>}
      <HabitPlan habit={habit} />

      <div className="habit-week">
        {days.map((d) => {
          const planned = isPlanned(habit, d)
          const isDone = done.has(`${habit.id}|${d}`)
          const future = d > today
          const label = formatWeekday(d, locale, 'short')
          return (
            <button
              key={d}
              className={`day-btn${isDone ? ' done' : ''}${planned ? '' : ' off'}${d === today ? ' today' : ''}`}
              disabled={future || !habit.active}
              title={planned ? date(d) : `${date(d)} · ${h.notPlanned}`}
              aria-label={h.markDay(habit.name, date(d))}
              aria-pressed={isDone}
              onClick={() => repo.toggleHabitCheck(habit.id, d)}
            >
              <span>{label}</span>
              <span className="day-mark">{isDone ? '✓' : planned ? '' : '·'}</span>
            </button>
          )
        })}
      </div>
      {warn && <p className="warn small-text">⚠ {h.neverMissTwice}</p>}

      <div className="task-actions">
        <button className="link" onClick={onEdit}>
          {t.common.edit}
        </button>
        <button className="link" onClick={() => repo.updateHabit(habit.id, { active: !habit.active })}>
          {habit.active ? h.pause : h.resume}
        </button>
        <button className="link danger" onClick={remove}>
          {t.common.delete}
        </button>
      </div>
    </div>
  )
}

/** The plan lines (only the ones filled in). */
function HabitPlan({ habit }: { habit: Habit }) {
  const lines = [
    habit.stack && `🔗 ${habit.stack}`,
    habit.intention && `📍 ${habit.intention}`,
    habit.attractive && `✨ ${habit.attractive}`,
    habit.two_minute && `⏱ ${habit.two_minute}`,
    habit.reward && `🎁 ${habit.reward}`,
  ].filter(Boolean)
  if (lines.length === 0) return null
  return (
    <ul className="habit-plan">
      {lines.map((l) => (
        <li key={l as string}>{l}</li>
      ))}
    </ul>
  )
}

// ---------- create / edit form ----------

function HabitForm({
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  initial: Draft
  isNew: boolean
  onSave: (d: Draft) => void
  onCancel: () => void
}) {
  const { t, locale } = useI18n()
  const f = t.habits.form
  const [d, setD] = useState<Draft>(initial)
  const [error, setError] = useState(false)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD({ ...d, [key]: value })
  // A Monday, to name the weekdays in the current language.
  const someWeek = weekDates('2026-11-16')

  const toggleDay = (day: number) =>
    set('days', d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day].sort())

  const submit = () => {
    if (!d.name.trim() || d.days.length === 0) return setError(true)
    onSave({ ...d, name: d.name.trim() })
  }

  const text = (key: 'identity' | 'intention' | 'stack' | 'attractive' | 'two_minute' | 'reward', label: string, placeholder: string) => (
    <label className="field">
      <span>{label}</span>
      <input value={d[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} />
    </label>
  )

  return (
    <div className="card stack habit-form">
      <h2>{isNew ? t.habits.newHabit.replace('+ ', '') : t.habits.editHabit}</h2>
      <div className="row">
        <label className="field grow">
          <span>{f.name}</span>
          <input autoFocus value={d.name} placeholder={f.namePlaceholder} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="field">
          <span>{f.category}</span>
          <select value={d.category} onChange={(e) => set('category', e.target.value as HabitCategory)}>
            {HABIT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.habits.categories[c].name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field">
        <span>{f.days}</span>
        <div className="row">
          {someWeek.map((date, i) => (
            <button
              key={date}
              type="button"
              className={d.days.includes(i + 1) ? 'chip on' : 'chip'}
              aria-pressed={d.days.includes(i + 1)}
              onClick={() => toggleDay(i + 1)}
            >
              {formatWeekday(date, locale, 'short')}
            </button>
          ))}
          <button type="button" className="link" onClick={() => set('days', [...ALL_DAYS])}>
            {f.everyDay}
          </button>
          <button type="button" className="link" onClick={() => set('days', [1, 2, 3, 4, 5])}>
            {f.weekdays}
          </button>
        </div>
      </div>

      {text('identity', f.identity, f.identityPlaceholder)}
      <h3>{f.law1}</h3>
      {text('stack', f.stack, f.stackPlaceholder)}
      {text('intention', f.intention, f.intentionPlaceholder)}
      <h3>{f.law2}</h3>
      {text('attractive', f.attractive, f.attractivePlaceholder)}
      <h3>{f.law3}</h3>
      {text('two_minute', f.twoMinute, f.twoMinutePlaceholder)}
      <h3>{f.law4}</h3>
      {text('reward', f.reward, f.rewardPlaceholder)}

      {error && <p className="bad">{f.required}</p>}
      <div className="row">
        <button className="btn primary" onClick={submit}>
          {t.common.save}
        </button>
        <button className="btn" onClick={onCancel}>
          {t.common.cancel}
        </button>
      </div>
    </div>
  )
}

// ---------- suggestions by 7 Habits category ----------

function Suggestions({ onPick }: { onPick: (d: Draft) => void }) {
  const { t } = useI18n()
  const h = t.habits
  return (
    <div className="card stack">
      <h2>{h.suggestionsTitle}</h2>
      <p className="muted small-text">{h.suggestionsHint}</p>
      {HABIT_CATEGORIES.map((c, i) => (
        <div key={c} className="suggestion-group">
          <p>
            <strong>
              {i + 1}. {h.categories[c].name}
            </strong>{' '}
            <span className="muted small-text">· {h.categories[c].hint}</span>
          </p>
          <div className="row">
            {h.suggestions[c].map((s) => (
              <button key={s.name} className="chip" onClick={() => onPick({ ...emptyDraft(c), ...s })}>
                + {s.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- Home: today's habits ----------

export function TodayHabits() {
  const { t } = useI18n()
  const h = t.habits
  const { today, habits, done } = useHabitData()
  const todays = habits.filter((x) => x.active && isPlanned(x, today))
  if (habits.length === 0) return null

  return (
    <div className="card">
      <div className="row spread">
        <h2>{h.today}</h2>
        <Link to="/tasks?view=habits">{h.manage}</Link>
      </div>
      {todays.length === 0 ? (
        <p className="muted">{h.noneToday}</p>
      ) : (
        <ul className="task-list">
          {todays.map((habit) => {
            const isDone = done.has(`${habit.id}|${today}`)
            const warn = !isDone && missedLastTime(habit, done, today)
            return (
              <li key={habit.id} className={isDone ? 'task-row status-done' : 'task-row'}>
                <button
                  className={isDone ? 'sb done on' : 'sb done'}
                  aria-pressed={isDone}
                  aria-label={h.markDay(habit.name, t.home.today)}
                  onClick={() => repo.toggleHabitCheck(habit.id, today)}
                >
                  ✓
                </button>
                <div className="task-main">
                  <span className="task-title">{habit.name}</span>
                  <span className="task-meta">
                    {h.streak(streak(habit, done, today))}
                    {habit.two_minute && ` · ⏱ ${habit.two_minute}`}
                    {warn && <span className="warn"> · ⚠ {h.neverMissTwice}</span>}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
