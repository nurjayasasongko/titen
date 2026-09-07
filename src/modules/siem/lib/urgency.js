/**
 * How a rule match becomes a queue position.
 *
 * Every SIEM does some version of this: the rule says how bad the pattern
 * is, the asset inventory says how much the target matters, and the two
 * combine into the number that sorts the analyst's queue. The exact matrix
 * differs per product; the shape of the idea does not.
 */
export const levels = ['low', 'medium', 'high', 'critical']

export function urgencyOf(severityIndex, priorityIndex) {
  return Math.min(levels.length - 1, Math.floor((severityIndex + priorityIndex + 1) / 2))
}

export const queue = [
  { id: 'A', title: 'Malware detected on endpoint', severity: 3, priority: 2 },
  { id: 'B', title: 'Outbound traffic to known bad IP', severity: 2, priority: 3 },
  { id: 'C', title: 'New admin account created', severity: 2, priority: 1 },
  { id: 'D', title: 'Expired certificate on internal service', severity: 0, priority: 1 },
]

/** The queue plus the alert the learner is configuring, sorted as an analyst sees it. */
export function rankedQueue(theirs) {
  return [...queue, theirs]
    .map((alert) => ({ ...alert, urgency: urgencyOf(alert.severity, alert.priority) }))
    .sort((a, b) => b.urgency - a.urgency || a.title.localeCompare(b.title))
}
