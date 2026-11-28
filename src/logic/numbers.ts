// Reading numbers and dates typed by hand. Pure functions, tested in numbers.test.ts.
import { isValidDate } from './weeks'

/**
 * What can be typed in a number field so far: digits with at most one
 * decimal point or comma ("", "3", "3,", "3,5", ".5"). Anything else is refused.
 */
export const isDecimalDraft = (text: string): boolean => /^\d*([.,]\d*)?$/.test(text)

/** "3,5" or "3.5" → 3.5; "" or an unfinished "," → null. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '' || t === '.' || !isDecimalDraft(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** 3.5 → "3,5" in Spanish, "3.5" in English; null → "". */
export const formatDecimal = (n: number | null, lang: 'en' | 'es'): string =>
  n === null ? '' : lang === 'es' ? String(n).replace('.', ',') : String(n)

/**
 * A full date with a sensible year. While a year is typed piece by piece
 * (2 → 20 → 202 → 2027) the field briefly holds years like 0002: not complete.
 */
export const isPlausibleDate = (d: string): boolean => isValidDate(d) && Number(d.slice(0, 4)) >= 1900 && Number(d.slice(0, 4)) <= 2999
