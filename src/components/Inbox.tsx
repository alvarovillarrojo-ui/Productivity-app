// The inbox: jot something down on Home in two seconds, deal with it later.
//   - InboxCapture (Home): a text box + what is waiting.
//   - InboxReview (Day → Opening and Closing): each note becomes a task for
//     today or for this week (no day), or is ticked off and goes away.
import { useRef, useState } from 'react'
import * as repo from '../data/repo'
import { useLive } from '../data/useLive'
import type { Cycle, InboxItem } from '../data/types'
import { useI18n } from '../i18n'
import { defaultWeek, todayISO, weekNumberOf } from '../logic/weeks'

const useInbox = () => useLive(repo.listInbox, [], [] as InboxItem[])

export function InboxCapture() {
  const { t } = useI18n()
  const m = t.inbox
  const items = useInbox()
  const [text, setText] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setText('') // clear first, so anything typed while saving isn't lost
    ref.current?.focus()
    await repo.addToInbox(value)
  }

  return (
    <div className="card inbox">
      <h2>📥 {m.title}</h2>
      <form className="row" onSubmit={add}>
        <input ref={ref} className="grow" placeholder={m.placeholder} aria-label={m.placeholder} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" disabled={!text.trim()}>
          {m.add}
        </button>
      </form>
      {items.length > 0 && (
        <>
          <ul className="inbox-list">
            {items.map((x) => (
              <li key={x.id}>
                <span className="grow">{x.text}</span>
                <button className="link muted" aria-label={m.remove} title={m.remove} onClick={() => repo.deleteFromInbox(x.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="muted small-text">{m.waiting(items.length)}</p>
        </>
      )}
    </div>
  )
}

export function InboxReview({ cycle }: { cycle: Cycle }) {
  const { t } = useI18n()
  const m = t.inbox
  const items = useInbox()
  if (items.length === 0) return null

  const today = todayISO()
  const inCycle = weekNumberOf(cycle, today) >= 1 && weekNumberOf(cycle, today) <= cycle.length_weeks
  const toTask = (x: InboxItem, forToday: boolean) =>
    repo.inboxToTask(x.id, {
      cycle_id: cycle.id,
      week_number: defaultWeek(cycle, today),
      title: x.text,
      planned_date: forToday && inCycle ? today : null,
    })

  return (
    <div className="card inbox">
      <h2>📥 {m.reviewTitle(items.length)}</h2>
      <p className="muted small-text">{m.reviewHint}</p>
      <ul className="inbox-list">
        {items.map((x) => (
          <li key={x.id}>
            <span className="grow">{x.text}</span>
            <span className="row inbox-actions">
              {inCycle && (
                <button className="chip" onClick={() => toTask(x, true)}>
                  {m.today}
                </button>
              )}
              <button className="chip" onClick={() => toTask(x, false)}>
                {m.week}
              </button>
              <button className="chip" title={m.doneHint} onClick={() => repo.deleteFromInbox(x.id)}>
                ✓ {m.done}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
