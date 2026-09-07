/**
 * The maths behind the correlation demo, and behind every "N events in M
 * minutes" rule in every SIEM: a sliding window, a group-by, a threshold.
 */

/** Events belonging to `user` whose time falls inside (now - window, now]. */
export function countInWindow(events, user, now, windowSeconds) {
  return events.filter(
    (event) =>
      event.user === user && event.t <= now && event.t > now - windowSeconds,
  ).length
}

/** Per-user counts inside the window, plus whichever user is worst. */
export function evaluate(events, now, windowSeconds, threshold) {
  const users = [...new Set(events.map((event) => event.user))]
  const counts = users.map((user) => ({
    user,
    count: countInWindow(events, user, now, windowSeconds),
  }))
  const top = counts.reduce(
    (best, entry) => (entry.count > best.count ? entry : best),
    { user: null, count: 0 },
  )
  return {
    counts,
    top,
    fired: top.count >= threshold,
    arrived: events.filter((event) => event.t <= now).length,
  }
}

/**
 * The first moment the rule would fire. Only event times need checking: a
 * window's count can only rise when a new event enters it.
 */
export function firstTrigger(events, windowSeconds, threshold) {
  for (const event of [...events].sort((a, b) => a.t - b.t)) {
    if (evaluate(events, event.t, windowSeconds, threshold).fired) return event.t
  }
  return null
}
