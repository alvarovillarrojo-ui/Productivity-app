import { TARGET_EXECUTION } from '../logic/metrics'

/** CSS colour class for a percentage: green at/above 85%, red below, grey for "–". */
export function pctClass(pct: number | null): string {
  if (pct === null) return 'muted'
  return pct >= TARGET_EXECUTION ? 'good' : 'bad'
}
