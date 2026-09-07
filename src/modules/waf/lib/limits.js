/**
 * How much of a request body each implementation will actually read.
 *
 * These are the documented defaults, and they matter more than they look:
 * a rule cannot match bytes the engine never buffered, so the limit is a
 * hard ceiling on what any rule set can possibly detect.
 */
export const KB = 1024

export const inspectionLimits = [
  {
    id: 'modsec',
    name: 'ModSecurity / Coraza',
    scope: 'SecRequestBodyNoFilesLimit',
    limitKb: 1024,
    note: 'Default 1048576 bytes for request bodies that are not file uploads. SecRequestBodyLimit, which covers uploads too, defaults to 134217728.',
    overflow:
      'SecRequestBodyLimitAction decides what happens past the limit: Reject returns 413, ProcessPartial inspects what was buffered and lets the rest through.',
  },
  {
    id: 'aws-alb',
    name: 'AWS WAF — ALB / AppSync',
    scope: 'Body and JSON body',
    limitKb: 8,
    note: 'AWS WAF can inspect the first 8 KB of the body for Application Load Balancer and AppSync. Not configurable.',
    overflow:
      'Oversize handling is mandatory on the rule: CONTINUE inspects what fits, MATCH treats the request as matching, NO_MATCH treats it as not matching.',
  },
  {
    id: 'aws-cf',
    name: 'AWS WAF — CloudFront / API Gateway',
    scope: 'Body and JSON body',
    limitKb: 16,
    maxKb: 64,
    note: 'Default 16 KB, raisable to 64 KB in the web ACL configuration.',
    overflow: 'Same three oversize choices, chosen per rule.',
  },
]

export const oversizeHandling = [
  {
    id: 'CONTINUE',
    label: 'CONTINUE',
    blurb: 'Inspect the part that fits and carry on. The payload past the limit is simply not examined.',
    seesBeyond: false,
    flagsUnseen: false,
  },
  {
    id: 'NO_MATCH',
    label: 'NO_MATCH',
    blurb: 'Treat an oversize component as not matching. Quiet, and the most common way a large request walks straight through.',
    seesBeyond: false,
    flagsUnseen: false,
  },
  {
    id: 'MATCH',
    label: 'MATCH',
    blurb: 'Treat an oversize component as matching the rule. Nothing is hidden from you, but every large legitimate upload trips it.',
    seesBeyond: false,
    flagsUnseen: true,
  },
]

/** Is a payload at this offset inside what the implementation buffers? */
export function isInspected(limit, payloadOffsetKb) {
  return payloadOffsetKb < effectiveLimitKb(limit)
}

export function effectiveLimitKb(limit, raised = false) {
  return raised && limit.maxKb ? limit.maxKb : limit.limitKb
}

/**
 * The verdict for one implementation: did it see the payload, and if not,
 * does the oversize setting at least tell you something was unexamined?
 */
export function verdictFor(limit, payloadOffsetKb, handlingId, raised = false) {
  const inspected = payloadOffsetKb < effectiveLimitKb(limit, raised)
  if (inspected) return { inspected, outcome: 'detected' }
  const handling = oversizeHandling.find((item) => item.id === handlingId)
  return {
    inspected,
    outcome: handling?.flagsUnseen ? 'flagged-blindly' : 'missed',
  }
}
