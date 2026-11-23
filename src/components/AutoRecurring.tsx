// Invisible helper, always mounted: keeps the recurring tasks of the current
// week (and next week, from Saturday) in place. It runs when the app opens,
// when the date changes (checked every minute, so an app left open overnight
// still prepares the new week) and whenever the cycle's tactics change
// (e.g. a new tactic, or a higher "times per week").
import { useEffect, useState } from 'react'
import * as repo from '../data/repo'
import { useLive } from '../data/useLive'
import { todayISO } from '../logic/weeks'

export default function AutoRecurring() {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const timer = setInterval(() => setToday(todayISO()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // A short "fingerprint" of the active cycle's tactics: when it changes,
  // the tasks are checked again.
  const fingerprint = useLive(
    async () => {
      const cycle = await repo.getActiveCycle()
      if (!cycle) return ''
      const tactics = await repo.listTacticsForCycle(cycle.id)
      return [cycle.id, cycle.start_date, cycle.length_weeks, ...tactics.map((t) => `${t.id}:${t.active}:${t.weekly_frequency}`)].join(',')
    },
    [],
    '',
  )

  useEffect(() => {
    if (fingerprint) repo.ensureRecurringTasks(today).catch((e) => console.error('Recurring tasks:', e))
  }, [fingerprint, today])

  return null
}
