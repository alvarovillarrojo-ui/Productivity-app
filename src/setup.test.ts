// Smoke test: confirms the test runner works. Real tests arrive with the
// metrics module (step 3).
import { describe, expect, it } from 'vitest'

describe('test setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
