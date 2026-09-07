import { describe, expect, it } from 'vitest'
import { countInWindow, evaluate, firstTrigger } from './correlation.js'
import { scenarios } from '../data/learn/correlation.js'

const events = [
  { t: 10, user: 'a' },
  { t: 20, user: 'a' },
  { t: 30, user: 'a' },
  { t: 35, user: 'b' },
  { t: 200, user: 'a' },
]

describe('countInWindow', () => {
  it('counts only that user, only inside the window', () => {
    expect(countInWindow(events, 'a', 30, 60)).toBe(3)
    expect(countInWindow(events, 'b', 30, 60)).toBe(0)
  })

  it('drops events as they fall out of the back of the window', () => {
    expect(countInWindow(events, 'a', 100, 60)).toBe(0)
  })

  it('ignores events that have not happened yet', () => {
    expect(countInWindow(events, 'a', 25, 60)).toBe(2)
  })
})

describe('evaluate', () => {
  it('reports the worst user and whether the rule fires', () => {
    const result = evaluate(events, 30, 60, 3)
    expect(result.top).toEqual({ user: 'a', count: 3 })
    expect(result.fired).toBe(true)
  })

  it('does not fire below the threshold', () => {
    expect(evaluate(events, 30, 60, 4).fired).toBe(false)
  })

  it('does not fire when the same total is spread across users', () => {
    const spread = [
      { t: 10, user: 'a' },
      { t: 11, user: 'b' },
      { t: 12, user: 'c' },
      { t: 13, user: 'd' },
    ]
    expect(evaluate(spread, 20, 60, 3).fired).toBe(false)
    expect(evaluate(spread, 20, 60, 3).arrived).toBe(4)
  })
})

describe('the two teaching scenarios behave as advertised', () => {
  const normal = scenarios.find((s) => s.id === 'normal')
  const attack = scenarios.find((s) => s.id === 'attack')

  it('everyday noise never trips a sane rule', () => {
    expect(firstTrigger(normal.events, 120, 8)).toBeNull()
  })

  it('the attack does trip it', () => {
    expect(firstTrigger(attack.events, 120, 8)).not.toBeNull()
  })

  it('a threshold set too low turns the quiet day into a false positive', () => {
    expect(firstTrigger(normal.events, 300, 2)).not.toBeNull()
  })

  it('a threshold set too high lets the attack through', () => {
    expect(firstTrigger(attack.events, 120, 20)).toBeNull()
  })

  it('too short a window also lets the attack through', () => {
    expect(firstTrigger(attack.events, 10, 8)).toBeNull()
  })
})
