// Tracking: how the whole cycle is going, week by week.
//   - cycle totals so far (overall and per goal), task counts, best/worst week
//   - a line chart of execution % per week (overall + each goal, 85% target)
//   - a week-by-week table with counts and execution % (also the accessible
//     "table view" of the chart)
//   - hours per goal per week against target and minimum
// All numbers come from logic/metrics.ts.
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import * as repo from '../data/repo'
import { useActiveCycle, useCycleTasks, useGoals, useHabitChecks, useHabits, useTactics } from '../data/hooks'
import { useLive } from '../data/useLive'
import { checkSet, consistency } from '../logic/habits'
import type { Cycle, FocusSession, Goal, Tactic, Task } from '../data/types'
import { useI18n } from '../i18n'
import NoActiveCycle from '../components/NoActiveCycle'
import { pctClass } from '../components/pctClass'
import { goalColor, OVERALL_COLOR } from '../components/colors'
import {
  bestAndWorstWeeks,
  cycleExecution,
  cycleTotals,
  formatHours,
  formatPct,
  goalOfTask,
  hoursLevel,
  sumActualHours,
  taskCounts,
  TARGET_EXECUTION,
  tacticToGoal,
  weekHours,
  type Execution,
  type WeekExecution,
} from '../logic/metrics'
import { cyclePosition, todayISO, weekEnd, weekStart } from '../logic/weeks'


export default function TrackingScreen() {
  const cycle = useActiveCycle()
  if (cycle === undefined) return null
  if (cycle === null) return <NoActiveCycle />
  return <TrackingForCycle cycle={cycle} />
}

function TrackingForCycle({ cycle }: { cycle: Cycle }) {
  const { t, date } = useI18n()
  const today = todayISO()
  const position = cyclePosition(cycle, today)
  const goals = useGoals(cycle.id)
  const tactics = useTactics(cycle.id)
  const tasks = useCycleTasks(cycle.id)

  if (position.phase === 'before') {
    return (
      <section className="stack">
        <h1>{t.tracking.title}</h1>
        <p className="note">{t.tracking.notStarted(date(cycle.start_date))}</p>
      </section>
    )
  }

  // Weeks that have started so far, and the one still in progress (if any).
  const shownWeeks = position.phase === 'during' ? position.week : cycle.length_weeks
  const currentWeek = position.phase === 'during' ? position.week : null
  const weeks = cycleExecution(cycle, tasks, goals, tactics, today)
  const started = weeks.slice(0, shownWeeks)
  const totals = cycleTotals(started, goals)
  // Best/worst only among finished weeks: a week in progress isn't judged yet.
  const bw = bestAndWorstWeeks(started.filter((w) => w.week !== currentWeek))
  const counts = taskCounts(tasks.filter((x) => x.week_number <= shownWeeks))

  return (
    <section className="stack tracking">
      <h1>{t.tracking.title}</h1>

      <div className="card">
        <h2>
          {t.tracking.cycleSoFar}{' '}
          <span className="muted small-text">
            · {t.tracking.weeksSoFar(shownWeeks, cycle.length_weeks)}
          </span>
        </h2>
        <div className="totals">
          <TotalTile name={t.tracking.overall} exec={totals.overall} big />
          {goals.map((g, i) => (
            <TotalTile key={g.id} name={g.name} exec={totals.byGoal.get(g.id)!} color={goalColor(i)} />
          ))}
        </div>
        <p className="muted small-text">
          {t.tracking.counts(counts.done, counts.missed, counts.open)} — {t.tracking.countsHint}
          {bw && (
            <>
              <br />
              {t.tracking.bestWorst(
                bw.best.week,
                formatPct(bw.best.overall.pct),
                bw.worst.week,
                formatPct(bw.worst.overall.pct),
              )}
            </>
          )}
        </p>
      </div>

      <div className="card">
        <h2>{t.tracking.chartTitle}</h2>
        <ExecutionChart weeks={weeks} shownWeeks={shownWeeks} goals={goals} />
        <p className="muted small-text">{t.tracking.chartHint}</p>
      </div>

      <div className="card">
        <h2>{t.tracking.tableTitle}</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.tracking.week}</th>
                <th className="num-col">{t.tracking.done}</th>
                <th className="num-col">{t.tracking.missed}</th>
                <th className="num-col">{t.tracking.open}</th>
                <th className="num-col">{t.tracking.overall}</th>
                {goals.map((g) => (
                  <th key={g.id} className="num-col" title={g.name}>
                    {g.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {started.map((w) => {
                const c = taskCounts(tasks.filter((x) => x.week_number === w.week))
                return (
                  <tr key={w.week}>
                    <td>
                      <WeekCell cycle={cycle} week={w.week} current={w.week === currentWeek} />
                    </td>
                    <td className="num-col">{c.done}</td>
                    <td className="num-col">{c.missed}</td>
                    <td className="num-col">{c.open}</td>
                    <PctCell exec={w.overall} strong />
                    {goals.map((g) => (
                      <PctCell key={g.id} exec={w.byGoal.get(g.id)!} />
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>{t.tracking.hoursTitle}</h2>
        <p className="muted small-text">{t.tracking.hoursHint}</p>
        <HoursTable
          cycle={cycle}
          tasks={tasks}
          goals={goals}
          tactics={tactics}
          shownWeeks={shownWeeks}
          currentWeek={currentWeek}
        />
      </div>

      <HabitsAndFocus cycle={cycle} shownWeeks={shownWeeks} currentWeek={currentWeek} today={today} />
    </section>
  )
}

// ---------- habits and focus per week ----------

/**
 * Habit consistency (separate from execution %) and focus time per cycle
 * week. Paused habits are left out.
 */
function HabitsAndFocus({
  cycle,
  shownWeeks,
  currentWeek,
  today,
}: {
  cycle: Cycle
  shownWeeks: number
  currentWeek: number | null
  today: string
}) {
  const { t } = useI18n()
  const x = t.tracking
  const habits = useHabits().filter((h) => h.active)
  const done = checkSet(useHabitChecks(cycle.start_date))
  const sessions = useLive(() => repo.listFocusSessions(cycle.start_date), [cycle.start_date], [] as FocusSession[])
  const weeks = Array.from({ length: shownWeeks }, (_, i) => i + 1)
  const last = weekEnd(cycle, shownWeeks)

  const rows = weeks.map((week) => {
    const from = weekStart(cycle, week)
    const to = weekEnd(cycle, week)
    const inWeek = sessions.filter((s) => s.date >= from && s.date <= to)
    return {
      week,
      habits: consistency(habits, done, from, to, today),
      minutes: inWeek.reduce((sum, s) => sum + s.minutes, 0),
      pomodoros: inWeek.filter((s) => s.completed).length,
    }
  })
  const totalHabits = consistency(habits, done, cycle.start_date, last, today)
  const totalMinutes = rows.reduce((sum, r) => sum + r.minutes, 0)
  const totalPomodoros = rows.reduce((sum, r) => sum + r.pomodoros, 0)

  return (
    <div className="card">
      <h2>{x.habitsFocusTitle}</h2>
      <p className="muted small-text">{x.habitsFocusHint}</p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>{x.week}</th>
              <th className="num-col">{x.habitsCol}</th>
              <th className="num-col">{x.focusCol}</th>
              <th className="num-col">{x.pomodorosCol}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.week}>
                <td>
                  <WeekCell cycle={cycle} week={r.week} current={r.week === currentWeek} />
                </td>
                <td className={`num-col ${pctClass(r.habits.pct)}`} title={`${r.habits.done} / ${r.habits.planned}`}>
                  {formatPct(r.habits.pct)}
                </td>
                <td className="num-col">{formatHours(r.minutes / 60)}</td>
                <td className="num-col">{r.pomodoros}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>{x.total}</td>
              <td className={`num-col ${pctClass(totalHabits.pct)}`}>{formatPct(totalHabits.pct)}</td>
              <td className="num-col">{formatHours(totalMinutes / 60)}</td>
              <td className="num-col">{totalPomodoros}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ---------- pieces ----------

function TotalTile({ name, exec, color, big }: { name: string; exec: Execution; color?: string; big?: boolean }) {
  return (
    <div className={big ? 'total-tile big' : 'total-tile'}>
      <span className="total-name">
        {color && <span className="swatch" style={{ background: color }} />}
        {name}
      </span>
      <span className={`total-pct ${pctClass(exec.pct)}`}>{formatPct(exec.pct)}</span>
      <span className="muted small-text">
        {exec.done} / {exec.counted}
      </span>
    </div>
  )
}

function WeekCell({ cycle, week, current }: { cycle: Cycle; week: number; current: boolean }) {
  const { t, date } = useI18n()
  return (
    <Link to={`/tasks?week=${week}`} title={date(weekStart(cycle, week))}>
      {t.tracking.weekLong(week)}
      {current && <span className="muted"> · {t.tracking.inProgress}</span>}
    </Link>
  )
}

function PctCell({ exec, strong }: { exec: Execution; strong?: boolean }) {
  return (
    <td className={`num-col ${pctClass(exec.pct)}${strong ? ' strong' : ''}`} title={`${exec.done} / ${exec.counted}`}>
      {formatPct(exec.pct)}
    </td>
  )
}

// ---------- chart ----------

function ExecutionChart({ weeks, shownWeeks, goals }: { weeks: WeekExecution[]; shownWeeks: number; goals: Goal[] }) {
  const { t } = useI18n()
  const toPct = (e: Execution | undefined) => (e && e.pct !== null ? Math.round(e.pct * 100) : null)
  // Every week of the cycle is on the axis; weeks not started yet have no values.
  const data = weeks.map((w) => {
    const row: Record<string, number | string | null> = { week: t.tracking.weekShort(w.week) }
    const started = w.week <= shownWeeks
    row.overall = started ? toPct(w.overall) : null
    for (const g of goals) row[g.id] = started ? toPct(w.byGoal.get(g.id)) : null
    return row
  })

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#e3e6ea" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine
            y={TARGET_EXECUTION * 100}
            stroke={OVERALL_COLOR}
            strokeDasharray="4 4"
            label={{ value: `${t.tracking.target} 85%`, position: 'insideTopRight', fontSize: 11, fill: '#6b7280' }}
          />
          <Tooltip
            formatter={(v) => (v === null || v === undefined ? '–' : `${v}%`)}
            contentStyle={{ borderRadius: 8, borderColor: '#e3e6ea', fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {goals.map((g, i) => (
            <Line
              key={g.id}
              dataKey={g.id}
              name={g.name}
              stroke={goalColor(i)}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ))}
          <Line
            dataKey="overall"
            name={t.tracking.overall}
            stroke={OVERALL_COLOR}
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- hours ----------

function HoursTable({
  cycle,
  tasks,
  goals,
  tactics,
  shownWeeks,
  currentWeek,
}: {
  cycle: Cycle
  tasks: Task[]
  goals: Goal[]
  tactics: Tactic[]
  shownWeeks: number
  currentWeek: number | null
}) {
  const { t } = useI18n()
  const rows = Array.from({ length: shownWeeks }, (_, i) => i + 1).map((week) => ({
    week,
    ...weekHours(
      tasks.filter((x) => x.week_number === week),
      goals,
      tactics,
    ),
  }))
  const tg = tacticToGoal(tactics)
  const showOther = rows.some((r) => r.other > 0)
  // The total covers finished weeks only, so it's compared with a fair target.
  const finished = currentWeek ? shownWeeks - 1 : shownWeeks
  const totalOther = rows.slice(0, finished).reduce((s, r) => s + r.other, 0)

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t.tracking.week}</th>
            {goals.map((g) => (
              <th key={g.id} className="num-col" title={g.name}>
                {g.name}
              </th>
            ))}
            {showOther && <th className="num-col">{t.tracking.other}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const current = r.week === currentWeek
            return (
              <tr key={r.week}>
                <td>
                  <WeekCell cycle={cycle} week={r.week} current={current} />
                </td>
                {r.byGoal.map((h) => (
                  <td
                    key={h.goalId}
                    // A week still in progress isn't judged yet: no colour.
                    className={`num-col ${current ? '' : levelClass(h.level)}`}
                  >
                    {hoursOf(h.actual, h.target)}
                  </td>
                ))}
                {showOther && <td className="num-col muted">{round(r.other)}</td>}
              </tr>
            )
          })}
        </tbody>
        {finished > 0 && (
          <tfoot>
            <tr>
              <td>{t.tracking.totalFinished(finished)}</td>
              {goals.map((g) => {
                const actual = sumActualHours(
                  tasks.filter((x) => x.week_number <= finished && goalOfTask(x, tg) === g.id),
                )
                const target = g.weekly_hours_target * finished
                const min = g.weekly_hours_minimum === null ? null : g.weekly_hours_minimum * finished
                return (
                  <td key={g.id} className={`num-col ${levelClass(hoursLevel(actual, target, min))}`}>
                    {hoursOf(actual, target)}
                  </td>
                )
              })}
              {showOther && <td className="num-col muted">{round(totalOther)}</td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

const round = (h: number) => `${Math.round(h * 10) / 10}`
const hoursOf = (actual: number, target: number) => `${round(actual)} / ${round(target)} h`
const levelClass = (level: 'target' | 'minimum' | 'below') =>
  level === 'target' ? 'good' : level === 'minimum' ? 'warn' : 'bad'
