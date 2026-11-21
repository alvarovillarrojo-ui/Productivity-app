// React hook that re-runs a data query whenever the stored data changes,
// so screens update by themselves after any edit (no refresh needed).
//
// Example:  const goals = useLive(() => listGoals(cycleId), [cycleId], [])
//
// Screens use this instead of Dexie directly, so the storage can be swapped
// later by changing only this file and `repo.ts`.
import { useLiveQuery } from 'dexie-react-hooks'

export function useLive<T>(query: () => Promise<T>, deps: unknown[], initial: T): T {
  return useLiveQuery(query, deps, initial) as T
}

/** Like useLive, but returns `undefined` while loading (to tell "loading" from "empty"). */
export function useLiveMaybe<T>(query: () => Promise<T>, deps: unknown[]): T | undefined {
  return useLiveQuery(query, deps)
}
