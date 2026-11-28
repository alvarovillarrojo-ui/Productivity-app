import { describe, expect, it } from 'vitest'
import { formatDecimal, isDecimalDraft, isPlausibleDate, parseDecimal } from './numbers'

describe('typing numbers', () => {
  it('lets you type decimals with a comma or a point, step by step', () => {
    for (const ok of ['', '3', '3,', '3,5', '3.5', '.5', '30', '0,25']) expect(isDecimalDraft(ok)).toBe(true)
    for (const bad of ['3,5,', '3a', '-1', '3..5', '1e3']) expect(isDecimalDraft(bad)).toBe(false)
  })
  it('reads "3,5" and "3.5" as three and a half', () => {
    expect(parseDecimal('3,5')).toBe(3.5)
    expect(parseDecimal('3.5')).toBe(3.5)
    expect(parseDecimal('30')).toBe(30)
    expect(parseDecimal('3,')).toBe(3)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal(',')).toBeNull()
  })
  it('shows the decimal sign of the language', () => {
    expect(formatDecimal(3.5, 'es')).toBe('3,5')
    expect(formatDecimal(3.5, 'en')).toBe('3.5')
    expect(formatDecimal(null, 'es')).toBe('')
  })
})

describe('typing dates', () => {
  it('waits for a full year before using the date', () => {
    expect(isPlausibleDate('2027-03-10')).toBe(true)
    expect(isPlausibleDate('0002-03-10')).toBe(false)
    expect(isPlausibleDate('0202-03-10')).toBe(false)
    expect(isPlausibleDate('2027-02-30')).toBe(false)
  })
})
