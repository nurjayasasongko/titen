import { evaluate, firstTrigger } from './correlation.js'

/**
 * The behavioural difference between a streaming correlation engine and a
 * scheduled one.
 *
 * A streaming engine sees every event as it arrives, so it fires at the
 * instant the pattern completes. A scheduled engine only looks when its
 * timer says so, over however far back it was told to look — so it fires
 * at the first run after the pattern completed, and it can miss the
 * pattern altogether if it does not look back far enough.
 */

/** Streaming: the moment the Nth event lands. */
export function streamingTrigger(events, ruleWindow, threshold) {
  return firstTrigger(events, ruleWindow, threshold)
}

/** Every moment a scheduled search runs, up to the horizon. */
export function scheduleRuns(interval, horizon) {
  const runs = []
  for (let t = interval; t <= horizon; t += interval) runs.push(t)
  return runs
}

/**
 * Scheduled: the first run whose lookback contains enough of the pattern.
 * A lookback shorter than the rule's own window silently shrinks the rule.
 */
export function scheduledTrigger(events, { ruleWindow, threshold, interval, lookback, horizon }) {
  const effectiveWindow = Math.min(ruleWindow, lookback)
  for (const run of scheduleRuns(interval, horizon)) {
    if (evaluate(events, run, effectiveWindow, threshold).fired) return run
  }
  return null
}

/** How long the attacker had after the pattern completed. */
export function detectionDelay(streamingAt, scheduledAt) {
  if (streamingAt == null || scheduledAt == null) return null
  return scheduledAt - streamingAt
}
