// Setup wizard: guides the user through starting a new cycle, one step per
// screen. Shown on first run and from "Start new cycle" on the Goals screen.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as repo from '../data/repo'
import type { Cycle, Task } from '../data/types'
import { todayISO } from '../logic/weeks'
import {
  applyCarryOver,
  createDraft,
  filledGoals,
  filledTactics,
  getSteps,
  validateStep,
  type DraftIssue,
  type PreviousCycle,
  type StepId,
  type WizardDraft,
} from './setup/draft'
import { useI18n } from '../i18n'
import WelcomeStep from './setup/WelcomeStep'
import ReviewStep from './setup/ReviewStep'
import VisionStep from './setup/VisionStep'
import CycleStep from './setup/CycleStep'
import GoalsStep from './setup/GoalsStep'
import TacticsStep from './setup/TacticsStep'
import SummaryStep from './setup/SummaryStep'

/** What the wizard loads before it can show anything. */
interface Loaded {
  cycleCount: number
  previous: (PreviousCycle & { cycle: Cycle; tasks: Task[] }) | null
}

async function loadPrevious(): Promise<Loaded> {
  const cycles = await repo.listCycles()
  // The cycle to review: the active one, otherwise the most recent one.
  const prevCycle = (await repo.getActiveCycle()) ?? cycles[0]
  if (!prevCycle) return { cycleCount: 0, previous: null }
  const [goals, tactics, tasks] = await Promise.all([
    repo.listGoals(prevCycle.id),
    repo.listTacticsForCycle(prevCycle.id),
    repo.listTasksForCycle(prevCycle.id),
  ])
  return {
    cycleCount: cycles.length,
    previous: { id: prevCycle.id, vision: prevCycle.vision, goals, tactics, cycle: prevCycle, tasks },
  }
}

export default function SetupScreen() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [draft, setDraft] = useState<WizardDraft | null>(null)
  // Problems are stored as codes (or plain text for unexpected errors) and
  // translated when shown, so switching language updates them too.
  const [errors, setErrors] = useState<(DraftIssue | string)[]>([])
  const [starting, setStarting] = useState(false)

  // Load the previous cycle and any unfinished draft (once).
  useEffect(() => {
    ;(async () => {
      const data = await loadPrevious()
      const saved = (await repo.getSetting('wizardDraft')) as WizardDraft | undefined
      const usable = saved?.version === 1 && saved.previousCycleId === (data.previous?.id ?? null)
      setLoaded(data)
      setDraft(usable ? saved : newDraft(data))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function newDraft(data: Loaded): WizardDraft {
    return createDraft({
      previous: data.previous,
      cycleCount: data.cycleCount,
      today: todayISO(),
      cycleName: t.setup.defaultCycleName,
    })
  }

  if (!loaded || !draft) return <p className="muted">{t.common.loading}</p>

  const steps = getSteps(loaded.cycleCount === 0, loaded.previous !== null)
  const step = steps.includes(draft.step) ? draft.step : steps[0]
  const index = steps.indexOf(step)

  /** Change the draft and save it straight away. */
  const change = (patch: Partial<WizardDraft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    setErrors([])
    repo.setSetting('wizardDraft', next)
  }

  const goTo = (target: StepId) => change({ step: target })

  const next = () => {
    const problems = validateStep(draft, step)
    if (problems.length > 0) return setErrors(problems)
    let updated = draft
    // Leaving the review step: copy the ticked goals/tactics into the draft.
    if (step === 'review' && loaded.previous) updated = applyCarryOver(draft, loaded.previous)
    change({ ...updated, step: steps[index + 1] })
  }

  const back = () => goTo(steps[index - 1])

  const startOver = async () => {
    if (!confirm(t.setup.confirmStartOver)) return
    await repo.deleteSetting('wizardDraft')
    setErrors([])
    setDraft(newDraft(loaded))
  }

  const start = async () => {
    const problems = validateStep(draft, 'summary')
    if (problems.length > 0) return setErrors(problems)
    setStarting(true)
    try {
      await repo.startNewCycle({
        cycle: {
          name: draft.cycleName.trim(),
          start_date: draft.startDate,
          length_weeks: draft.lengthWeeks,
          vision: draft.vision.trim() || null,
          notes: '',
        },
        goals: filledGoals(draft).map((g) => ({
          name: g.name.trim(),
          description: g.description.trim(),
          weekly_hours_target: g.weekly_hours_target ?? 0,
          weekly_hours_minimum: g.weekly_hours_minimum,
          tactics: filledTactics(g).map((t) => ({
            name: t.name.trim(),
            description: '',
            weekly_frequency: t.weekly_frequency,
          })),
        })),
      })
      await repo.deleteSetting('wizardDraft')
      navigate('/')
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)])
      setStarting(false)
    }
  }

  const info = t.setup.steps[step]
  const props = { draft, change }

  return (
    <section className="wizard">
      <div className="wizard-head">
        <div className="dots" aria-label={`Step ${index + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <span key={s} className={i === index ? 'dot current' : i < index ? 'dot done' : 'dot'} />
          ))}
        </div>
        <button className="link" onClick={startOver}>
          {t.setup.startOver}
        </button>
      </div>
      <h1>{info.title}</h1>
      <p className="muted hint">{info.hint}</p>

      {step === 'welcome' && <WelcomeStep onStart={next} />}
      {step === 'review' && loaded.previous && <ReviewStep {...props} previous={loaded.previous} />}
      {step === 'vision' && <VisionStep {...props} />}
      {step === 'cycle' && <CycleStep {...props} />}
      {step === 'goals' && <GoalsStep {...props} />}
      {step === 'tactics' && <TacticsStep {...props} />}
      {step === 'summary' && <SummaryStep {...props} goTo={goTo} />}

      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((e, i) => (
            <li key={i}>{typeof e === 'string' ? e : t.setup.issue(e)}</li>
          ))}
        </ul>
      )}

      {step !== 'welcome' && (
        <div className="wizard-nav">
          <button className="btn" onClick={back} disabled={index === 0}>
            {t.common.back}
          </button>
          {step === 'summary' ? (
            <button className="btn primary" onClick={start} disabled={starting}>
              {starting ? t.setup.starting : t.setup.startCycle}
            </button>
          ) : (
            <button className="btn primary" onClick={next}>
              {t.common.next}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
