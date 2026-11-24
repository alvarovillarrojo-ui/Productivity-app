// Focus: a pomodoro timer for one task.
//   - choose a task of this week (or free focus); #/focus?task=<id> preselects it
//   - 25 min focus → 5 min break (15 every 4th); lengths can be changed
//   - a finished round adds its minutes to the task's actual hours and asks
//     whether the task is done; stopping early saves the minutes done so far
//   - today's sessions and totals
// The timer itself runs in FocusRunner, so it keeps going on other screens.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as repo from '../data/repo'
import { useActiveCycle, useWeekTasks } from '../data/hooks'
import { useLive } from '../data/useLive'
import type { FocusSession } from '../data/types'
import { useI18n } from '../i18n'
import NumberField from '../components/NumberField'
import { useFocusState, useNow } from '../components/FocusRunner'
import { unlockSound } from '../components/sound'
import SubjectSelect from '../components/SubjectSelect'
import {
  DEFAULT_FOCUS_SETTINGS,
  focusMinutesDone,
  formatClock,
  isPaused,
  isRunning,
  pause,
  phaseMinutes,
  remainingMs,
  resume,
  startFocus,
  type FocusSettings,
} from '../logic/focus'
import { formatHours } from '../logic/metrics'
import { defaultWeek, mondayOf, todayISO } from '../logic/weeks'

export default function FocusScreen() {
  const { t } = useI18n()
  const f = t.focus
  const now = useNow()
  const today = todayISO()
  const [params] = useSearchParams()
  const state = useFocusState()
  const settings = useLive(repo.getFocusSettings, [], DEFAULT_FOCUS_SETTINGS)
  const cycle = useActiveCycle() ?? null
  const weekTasks = useWeekTasks(cycle?.id, cycle ? defaultWeek(cycle, today) : 0)
  const sessions = useLive(() => repo.listFocusSessions(mondayOf(today)), [today], [] as FocusSession[])
  // undefined = nothing picked in the dropdown; null = free focus.
  const [chosen, setChosen] = useState<string | null | undefined>(params.get('task') ?? undefined)
  const [message, setMessage] = useState('')
  const [freeSubject, setFreeSubject] = useState<string | null>(null)

  // During a round or break the timer decides the task; between rounds the
  // dropdown does (so you can switch task for the next pomodoro).
  const between = state === null || state.phase === 'ready'
  const taskId = !between ? state.taskId : chosen !== undefined ? chosen : (state?.taskId ?? null)
  const task = weekTasks.find((x) => x.id === taskId)
  const choices = weekTasks.filter((x) => x.status === 'todo' || x.id === taskId)

  const running = isRunning(state)
  const paused = isPaused(state)
  const phase = state?.phase ?? 'ready'
  const left = state && phase !== 'ready' ? remainingMs(state, now) : settings.focus * 60_000
  const total = phaseMinutes(phase === 'ready' ? 'focus' : phase, settings) * 60_000
  const progress = total > 0 ? 1 - left / total : 0
  const minutesDone = state ? focusMinutesDone(state, settings, now) : 0

  const start = async () => {
    unlockSound()
    setMessage('')
    await repo.setFocusState({ ...startFocus(state, taskId, settings, Date.now()), subjectId: taskId ? null : freeSubject })
  }
  const stop = async (save: boolean) => {
    const saved = await repo.stopFocus(Date.now(), save)
    setMessage(save ? f.saved(saved) : f.discarded)
  }
  const answerDone = async (done: boolean) => {
    if (!state) return
    if (done && state.finished?.taskId) await repo.setTaskStatus(state.finished.taskId, 'done')
    await repo.setFocusState({ ...state, finished: null })
  }

  const todaySessions = sessions.filter((s) => s.date === today)
  const minutesToday = todaySessions.reduce((sum, s) => sum + s.minutes, 0)
  const minutesWeek = sessions.reduce((sum, s) => sum + s.minutes, 0)
  const finishedTask = state?.finished?.taskId ? weekTasks.find((x) => x.id === state.finished!.taskId) : undefined

  return (
    <section className="stack focus-screen">
      <h1>{f.title}</h1>
      <p className="muted">{f.intro}</p>

      <label className="field">
        <span>{f.task}</span>
        <select value={taskId ?? ''} disabled={!between} onChange={(e) => setChosen(e.target.value || null)}>
          <option value="">{f.freeFocus}</option>
          {choices.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </select>
      </label>
      {taskId === null && (
        <label className="field">
          <span>{t.students.subject}</span>
          <SubjectSelect value={state?.subjectId ?? freeSubject} onChange={setFreeSubject} disabled={!between} />
        </label>
      )}

      <div className={`focus-clock ${phase}${paused ? ' paused' : ''}`} style={{ ['--p' as string]: progress }}>
        <div className="focus-clock-inner">
          <span className="focus-phase">{f.phase[phase]}</span>
          <span className="focus-time">{formatClock(left)}</span>
          {state && state.round > 0 && <span className="muted small-text">{f.round(state.round + (phase === 'focus' ? 1 : 0))}</span>}
        </div>
      </div>

      {state?.finished && (
        <div className="note stack">
          <strong>{f.finished(state.finished.minutes, finishedTask?.title ?? '')}</strong>
          {finishedTask && finishedTask.status !== 'done' && finishedTask.kind !== 'block' ? (
            <div className="row">
              <span>{f.markDone}</span>
              <button className="btn primary" onClick={() => answerDone(true)}>
                ✓ {f.yesDone}
              </button>
              <button className="btn" onClick={() => answerDone(false)}>
                {f.notYet}
              </button>
            </div>
          ) : (
            <button className="link" onClick={() => answerDone(false)}>
              OK
            </button>
          )}
        </div>
      )}
      {(phase === 'short' || phase === 'long') && <p className="muted">☕ {f.breakTip}</p>}

      <div className="row focus-buttons">
        {(state === null || phase === 'ready') && (
          <button className="btn primary big" onClick={start}>
            {state ? f.startNext : f.start}
          </button>
        )}
        {phase === 'focus' && running && (
          <button className="btn big" onClick={() => repo.setFocusState(pause(state!, Date.now()))}>
            ⏸ {f.pause}
          </button>
        )}
        {paused && (
          <button className="btn primary big" onClick={() => repo.setFocusState(resume(state!, Date.now()))}>
            ▶ {f.resume}
          </button>
        )}
        {phase === 'focus' && (
          <>
            <button className="btn" onClick={() => stop(true)} disabled={minutesDone < 1}>
              ■ {f.stopSave(minutesDone)}
            </button>
            <button className="link danger" onClick={() => stop(false)}>
              {f.discard}
            </button>
          </>
        )}
        {(phase === 'short' || phase === 'long') && (
          <>
            <button className="btn" onClick={() => repo.setFocusState({ ...state!, phase: 'ready', endsAt: null, remainingMs: null })}>
              ⏭ {f.skipBreak}
            </button>
            <button className="link" onClick={() => stop(false)}>
              {f.endBreak}
            </button>
          </>
        )}
        {phase === 'ready' && state && (
          <button className="link" onClick={() => repo.setFocusState(null)}>
            {f.endBreak}
          </button>
        )}
      </div>
      {message && <p className="flash">{message}</p>}
      {task && <p className="muted small-text">{task.title}: {formatHours(task.actual_hours ?? 0)}{task.planned_hours ? ` / ${formatHours(task.planned_hours)}` : ''}</p>}

      <div className="card">
        <h2>{f.today}</h2>
        <p className="muted small-text">{f.totals(formatHours(minutesToday / 60), formatHours(minutesWeek / 60))}</p>
        {todaySessions.length === 0 ? (
          <p className="muted">{f.noSessions}</p>
        ) : (
          <ul className="session-list">
            {todaySessions.map((s) => (
              <li key={s.id}>
                <span className="muted">{new Date(s.started_at).toTimeString().slice(0, 5)}</span> {s.task_title || f.free} ·{' '}
                {s.minutes} min{!s.completed && <span className="muted"> ({f.early})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <FocusSettingsForm settings={settings} />
    </section>
  )
}

function FocusSettingsForm({ settings }: { settings: FocusSettings }) {
  const { t } = useI18n()
  const f = t.focus
  const set = (patch: Partial<FocusSettings>) => {
    const next = { ...settings, ...patch }
    // Whole minutes, at least 1 (focus 1–120, breaks 1–60, long every 1–10).
    const clamp = (v: number, max: number) => Math.min(max, Math.max(1, Math.round(v)))
    void repo.setSetting('focusSettings', {
      focus: clamp(next.focus, 120),
      shortBreak: clamp(next.shortBreak, 60),
      longBreak: clamp(next.longBreak, 60),
      longEvery: clamp(next.longEvery, 10),
    })
  }
  const field = (label: string, key: keyof FocusSettings) => (
    <label className="field">
      <span>{label}</span>
      <NumberField className="num small" min={1} step={1} value={settings[key]} onChange={(v) => v !== null && set({ [key]: v })} />
    </label>
  )
  return (
    <details className="card">
      <summary>{f.settings}</summary>
      <div className="row" style={{ marginTop: '0.6rem' }}>
        {field(f.focusLen, 'focus')}
        {field(f.shortLen, 'shortBreak')}
        {field(f.longLen, 'longBreak')}
        {field(f.longEvery, 'longEvery')}
      </div>
    </details>
  )
}
