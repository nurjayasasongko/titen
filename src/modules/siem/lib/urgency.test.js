import { describe, expect, it } from 'vitest'
import { levels, rankedQueue, urgencyOf } from './urgency.js'

describe('urgencyOf', () => {
  it('is lowest only when both inputs are lowest', () => {
    expect(levels[urgencyOf(0, 0)]).toBe('low')
  })

  it('is highest when both inputs are highest', () => {
    expect(levels[urgencyOf(3, 3)]).toBe('critical')
  })

  it('lets an important asset raise a middling rule', () => {
    expect(urgencyOf(1, 3)).toBeGreaterThan(urgencyOf(1, 0))
  })

  it('lets an unimportant asset damp a severe rule', () => {
    expect(urgencyOf(3, 0)).toBeLessThan(urgencyOf(3, 3))
  })

  it('is symmetric — neither input dominates the other', () => {
    expect(urgencyOf(3, 1)).toBe(urgencyOf(1, 3))
  })

  it('never escapes the scale', () => {
    for (let s = 0; s < 4; s += 1) {
      for (let p = 0; p < 4; p += 1) {
        expect(urgencyOf(s, p)).toBeGreaterThanOrEqual(0)
        expect(urgencyOf(s, p)).toBeLessThan(levels.length)
      }
    }
  })
})

describe('rankedQueue', () => {
  const theirs = { id: 'MINE', title: 'Multiple failed logins', severity: 2, priority: 2 }

  it('sorts most urgent first', () => {
    const ranked = rankedQueue(theirs)
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].urgency).toBeGreaterThanOrEqual(ranked[i].urgency)
    }
  })

  it('moves the learner’s alert up the queue when the asset matters more', () => {
    const low = rankedQueue({ ...theirs, priority: 0 })
    const high = rankedQueue({ ...theirs, priority: 3 })
    expect(high.findIndex((a) => a.id === 'MINE')).toBeLessThan(
      low.findIndex((a) => a.id === 'MINE'),
    )
  })
})
