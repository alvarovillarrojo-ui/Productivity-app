// Ready-made live data hooks used by several screens. They update the screen
// automatically whenever the data changes.
import * as repo from './repo'
import type { Cycle, Goal, Tactic, Task } from './types'
import { useLive, useLiveMaybe } from './useLive'

/**
 * The active cycle.
 * undefined = still loading, null = there is no active cycle.
 */
export function useActiveCycle(): Cycle | null | undefined {
  return useLiveMaybe(async () => (await repo.getActiveCycle()) ?? null, [])
}

export function useGoals(cycleId: string | undefined): Goal[] {
  return useLive(() => (cycleId ? repo.listGoals(cycleId) : Promise.resolve([])), [cycleId], [])
}

export function useTactics(cycleId: string | undefined): Tactic[] {
  return useLive(
    () => (cycleId ? repo.listTacticsForCycle(cycleId) : Promise.resolve([])),
    [cycleId],
    [],
  )
}

export function useWeekTasks(cycleId: string | undefined, week: number): Task[] {
  return useLive(
    () => (cycleId ? repo.listTasksForWeek(cycleId, week) : Promise.resolve([])),
    [cycleId, week],
    [],
  )
}

export function useCycleTasks(cycleId: string | undefined): Task[] {
  return useLive(
    () => (cycleId ? repo.listTasksForCycle(cycleId) : Promise.resolve([])),
    [cycleId],
    [],
  )
}
