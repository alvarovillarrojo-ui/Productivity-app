// Home: the screen for the daily routine (morning check, evening close).
// Fits on one screen:
//   - cycle, week number and days left; last backup date
//   - quick-add, today's tasks and the rest of this week's open tasks,
//     each with one-click done / missed
//   - this week's execution % (overall and per goal, with the 85% target)
//     and hours against target
import { Link } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useGoals, useTactics, useWeekTasks } from '../data/hooks'
import { useLive } from '../data/useLive'
import type { Cycle, Goal } from '../data/types'
import { useI18n } from '../i18n'
import NoActiveCycle from '../components/NoActiveCycle'
import QuickAdd from '../components/QuickAdd'
import TaskRow from '../components/TaskRow'
import { TodayHabits } from './HabitsPanel'
import { MustDoBanner } from './DayScreen'
import { minimumOf, tacticLabel } from '../components/TacticSelect'
import { pctClass } from '../components/pctClass'
import {
  formatHours,
  formatPct,
  isDue,
  TARGET_EXECUTION,
  executionPoints,
  weekExecution,
  weekHours,
  type Execution,
  type GoalHours,
} from '../logic/metrics'
import { cyclePosition, daysBetween, defaultWeek, todayISO, weekEnd, weekStart } from '../logic/weeks'

/** A backup older than this many days is highlighted. */
const BACKUP_WARNING_DAYS = 7

export default function HomeScreen() {
  const cycle = useActiveCycle()
  if (cycle === undefined) return null
  if (cycle === null) return <NoActiveCycle />
  return <HomeForCycle cycle={cycle} />
}

function HomeForCycle({ cycle }: { cycle: Cycle }) {
  const { t } = useI18n()
  const today = todayISO()
  const position = cyclePosition(cycle, today)
  // Before the cycle: show week 1. After it: show the last week.
  const week = defaultWeek(cycle, today)

  const goals = useGoals(cycle.id)
  const tactics = useTactics(cycle.id)
  const tasks = useWeekTasks(cycle.id, week)

  const first = weekStart(cycle, week)
  const last = weekEnd(cycle, week)
  const exec = weekExecution(cycle, week, tasks, goals, tactics, today)
  const hours = weekHours(tasks, goals, tactics)

  const todayTasks = tasks.filter((x) => x.planned_date === today)
  const openTasks = tasks.filter((x) => x.status === 'todo' && x.planned_date !== today)
  const label = (tacticId: string | null) => tacticLabel(tacticId, goals, tactics, t.common.other)

  return (
    <section className="home">
      <div className="home-head">
        <div>
          <h1>{cycle.name}</h1>
          <p className="muted">
            {position.phase === 'during' && (
              <>
                <strong className="week-badge">{t.home.weekOf(position.week, cycle.length_weeks)}</strong> ·{' '}
                {t.home.daysLeft(position.daysLeftInWeek)}
              </>
            )}
            {position.phase === 'before' && t.home.startsIn(position.daysUntilStart)}
          </p>
        </div>
        <BackupStatus today={today} />
      </div>

      <MustDoBanner tasks={tasks} tactics={tactics} goals={goals} />

      {position.phase === 'after' && (
        <div className="warn-box row spread">
          <span>{t.home.cycleOver}</span>
          <Link className="btn primary" to="/setup">
            {t.common.startNewCycle}
          </Link>
        </div>
      )}

      <div className="home-grid">
        <div className="stack">
          <QuickAdd cycle={cycle} week={week} goals={goals} tactics={tactics} minDate={first} maxDate={last} />

          <div>
            <h2>{t.home.today}</h2>
            {todayTasks.length === 0 ? (
              <p className="muted">{t.home.nothingToday}</p>
            ) : (
              <ul className="task-list">
                {todayTasks.map((x) => (
                  <TaskRow key={x.id} task={x} context={label(x.tactic_id)} minimum={minimumOf(x.tactic_id, tactics)} showDate={false} />
                ))}
              </ul>
            )}
          </div>

          <TodayHabits />

          <div>
            <div className="row spread">
              <h2>{t.home.openThisWeek}</h2>
              <Link to={`/tasks?week=${week}`}>{t.home.manage}</Link>
            </div>
            {openTasks.length === 0 ? (
              <p className="muted">{t.home.allDone}</p>
            ) : (
              <ul className="task-list">
                {openTasks.map((x) => (
                  <TaskRow key={x.id} task={x} context={label(x.tactic_id)} minimum={minimumOf(x.tactic_id, tactics)} overdue={isDue(x, last, today)} />
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h2>{t.home.execution}</h2>
            <ExecutionBars overall={exec.overall} goals={goals} byGoal={exec.byGoal} />
          </div>
          <div className="card">
            <h2>{t.home.hours}</h2>
            <HoursList goals={goals} hours={hours.byGoal} other={hours.other} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------- execution bars ----------

function ExecutionBars({
  overall,
  goals,
  byGoal,
}: {
  overall: Execution
  goals: Goal[]
  byGoal: Map<string, Execution>
}) {
  const { t } = useI18n()
  const rows = [
    { key: 'overall', name: t.home.overall, exec: overall, strong: true },
    ...goals.map((g) => ({ key: g.id, name: g.name, exec: byGoal.get(g.id)!, strong: false })),
  ]
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.key} className={r.strong ? 'bar-row strong' : 'bar-row'}>
          <span className="bar-label" title={r.name}>
            {r.name}
          </span>
          <div className="bar-track" title={`${executionPoints(r.exec)} / ${r.exec.counted}`}>
            <div
              className={`bar-fill ${pctClass(r.exec.pct)}-bg`}
              style={{ width: `${Math.round((r.exec.pct ?? 0) * 100)}%` }}
            />
            <div className="bar-target" style={{ left: `${TARGET_EXECUTION * 100}%` }} />
          </div>
          <span className={`bar-value ${pctClass(r.exec.pct)}`}>{formatPct(r.exec.pct)}</span>
        </div>
      ))}
      {goals.length === 0 && <p className="muted">{t.home.noGoals}</p>}
      <p className="bar-legend muted">
        <span className="legend-target" /> {t.home.target}
      </p>
    </div>
  )
}

// ---------- hours ----------

function HoursList({ goals, hours, other }: { goals: Goal[]; hours: GoalHours[]; other: number }) {
  const { t } = useI18n()
  return (
    <div className="bars">
      {hours.map((h) => {
        const goal = goals.find((g) => g.id === h.goalId)!
        const scale = Math.max(h.target, h.actual, 0.0001)
        const cls = h.level === 'target' ? 'good' : h.level === 'minimum' ? 'warn' : 'bad'
        return (
          <div key={h.goalId} className="bar-row">
            <span className="bar-label" title={goal.name}>
              {goal.name}
            </span>
            <div className="bar-track">
              <div className={`bar-fill ${cls}-bg`} style={{ width: `${(h.actual / scale) * 100}%` }} />
              {h.minimum !== null && h.minimum < scale && (
                <div className="bar-min" style={{ left: `${(h.minimum / scale) * 100}%` }} />
              )}
            </div>
            <span className="bar-value hours">
              {t.home.hoursOf(formatHours(h.actual), formatHours(h.target))}
              {h.minimum !== null && <span className="muted"> · {t.home.minimum(formatHours(h.minimum))}</span>}
            </span>
          </div>
        )
      })}
      {other > 0 && <p className="muted">{t.home.other(formatHours(other))}</p>}
    </div>
  )
}

// ---------- backup ----------

function BackupStatus({ today }: { today: string }) {
  const { t, locale } = useI18n()
  const last = useLive(async () => (await repo.getSetting('lastBackupAt')) ?? null, [], null)

  if (!last) {
    return (
      <Link className="backup-badge old" to="/data?action=backup">
        {t.home.neverBackedUp} · {t.home.backupNow}
      </Link>
    )
  }
  const lastDay = todayISO(new Date(last))
  const days = daysBetween(lastDay, today)
  const old = days > BACKUP_WARNING_DAYS
  const when = new Date(last).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  return (
    <Link className={old ? 'backup-badge old' : 'backup-badge'} to="/data?action=backup">
      {t.home.lastBackup(`${when} (${t.home.daysAgo(days)})`)}
      {old && ` · ${t.home.backupNow}`}
    </Link>
  )
}
