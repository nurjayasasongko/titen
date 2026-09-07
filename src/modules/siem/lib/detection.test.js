import { describe, expect, it } from 'vitest'
import {
  detectionDelay,
  scheduleRuns,
  scheduledTrigger,
  streamingTrigger,
} from './detection.js'
import { scenarios } from '../data/learn/correlation.js'

const attack = scenarios.find((scenario) => scenario.id === 'attack').events
const rule = { ruleWindow: 120, threshold: 8 }
const horizon = 300

describe('scheduleRuns', () => {
  it('lists every run up to the horizon', () => {
    expect(scheduleRuns(60, 300)).toEqual([60, 120, 180, 240, 300])
  })
})

describe('streaming versus scheduled', () => {
  const streamingAt = streamingTrigger(attack, rule.ruleWindow, rule.threshold)

  it('streaming fires the instant the pattern completes', () => {
    expect(streamingAt).not.toBeNull()
    // it is one of the event times, not an arbitrary clock tick
    expect(attack.some((event) => event.t === streamingAt)).toBe(true)
  })

  it('scheduled never beats streaming', () => {
    for (const interval of [30, 60, 120, 300]) {
      const scheduledAt = scheduledTrigger(attack, {
        ...rule,
        interval,
        lookback: 300,
        horizon,
      })
      if (scheduledAt !== null) expect(scheduledAt).toBeGreaterThanOrEqual(streamingAt)
    }
  })

  it('the delay is never longer than one schedule interval', () => {
    for (const interval of [30, 60, 120]) {
      const scheduledAt = scheduledTrigger(attack, {
        ...rule,
        interval,
        lookback: 300,
        horizon,
      })
      const delay = detectionDelay(streamingAt, scheduledAt)
      expect(delay).toBeLessThan(interval)
    }
  })

  it('a longer schedule means a longer wait', () => {
    const fast = scheduledTrigger(attack, { ...rule, interval: 30, lookback: 300, horizon })
    const slow = scheduledTrigger(attack, { ...rule, interval: 120, lookback: 300, horizon })
    expect(slow).toBeGreaterThan(fast)
  })

  it('a lookback shorter than the rule window shrinks the rule and can miss entirely', () => {
    const missed = scheduledTrigger(attack, {
      ...rule,
      interval: 60,
      lookback: 20,
      horizon,
    })
    expect(missed).toBeNull()
    // the same schedule with an honest lookback does catch it
    expect(
      scheduledTrigger(attack, { ...rule, interval: 60, lookback: 120, horizon }),
    ).not.toBeNull()
  })

  it('detectionDelay is null when either side never fires', () => {
    expect(detectionDelay(null, 120)).toBeNull()
    expect(detectionDelay(120, null)).toBeNull()
  })
})
