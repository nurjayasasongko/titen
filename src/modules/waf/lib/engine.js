import { applyAll } from './transforms.js'
import { defaultThresholds, rules, severityScore } from '../data/rules.js'

/**
 * A miniature CRS engine: collect the request components a rule targets,
 * normalise each one with that rule's transformations, test the detector,
 * and add the rule's severity score to a running total. Nothing blocks on
 * its own — the total is compared against the threshold at the end, which
 * is what CRS calls collaborative detection.
 */

const SPECIAL_CHARS = /[~!@#$%^&*()\-+={}[\]|:;"'`<>]/g

const detectors = {
  sqli: (value) =>
    /('\s*(or|and)\s|(\b(or|and)\b\s*\d+\s*=\s*\d+)|union\s+select|;\s*drop\s+table|'\s*=\s*')/i.test(
      value,
    ),
  sqlKeywords: (value) =>
    /(waitfor\s+delay|xp_cmdshell|information_schema|\bsleep\s*\(|\bbenchmark\s*\(|\bselect\b[\s\S]*\bfrom\b)/i.test(
      value,
    ),
  booleanSqli: (value) => /('|\b)\s*(or|and)\s+\d+\s*=\s*\d+/i.test(value),
  xss: (value) => /(<script|onerror\s*=|onload\s*=|javascript:|<img[^>]*src\s*=)/i.test(value),
  scannerUserAgent: (value) =>
    /(sqlmap|nikto|nmap|acunetix|nessus|w3af|dirbuster|masscan)/i.test(value),
  specialChars: (value, limit) => (value.match(SPECIAL_CHARS) ?? []).length > limit,
  missingHeader: (_value, header, request) =>
    !Object.keys(request.headers ?? {}).some(
      (name) => name.toLowerCase() === String(header).toLowerCase(),
    ),
}

/** Expands a rule's declared targets into the concrete values to inspect. */
export function collectTargets(rule, request) {
  const collected = []
  for (const target of rule.targets) {
    if (target === 'ARGS') {
      for (const [name, value] of Object.entries(request.args ?? {})) {
        collected.push({ target: `ARGS:${name}`, value: String(value) })
      }
    } else if (target.startsWith('&')) {
      // counting operator: the rule inspects presence, not content
      collected.push({ target, value: '' })
    } else if (target.startsWith('REQUEST_HEADERS:')) {
      const header = target.slice('REQUEST_HEADERS:'.length)
      const value = Object.entries(request.headers ?? {}).find(
        ([name]) => name.toLowerCase() === header.toLowerCase(),
      )?.[1]
      if (value !== undefined) collected.push({ target, value: String(value) })
    }
  }
  return collected
}

function isExcluded(exclusions, ruleId, target) {
  return (exclusions ?? []).some(
    (exclusion) =>
      exclusion.ruleId === ruleId && (!exclusion.target || exclusion.target === target),
  )
}

/**
 * @param request      the request under inspection
 * @param paranoiaLevel  1-4; rules above it are not even loaded
 * @param threshold    inbound anomaly score threshold (CRS default 5)
 * @param exclusions   [{ ruleId, target? }] — target-less means removed everywhere
 * @param engineOff    detection-only mode: still scores, never blocks
 */
export function evaluate(request, options = {}) {
  const {
    paranoiaLevel = 1,
    threshold = defaultThresholds.inbound,
    exclusions = [],
    engineOff = false,
    ruleset = rules,
  } = options

  const matches = []
  let score = 0

  for (const rule of ruleset) {
    if (rule.paranoia > paranoiaLevel) continue
    if (isExcluded(exclusions, rule.id, null)) continue

    for (const { target, value } of collectTargets(rule, request)) {
      if (isExcluded(exclusions, rule.id, target)) continue
      const normalised = applyAll(value, rule.transforms)
      const detector = detectors[rule.detector]
      if (!detector) continue
      if (!detector(normalised, rule.detectorArg, request)) continue

      const points = severityScore[rule.severity]
      score += points
      matches.push({
        rule,
        target,
        raw: value,
        normalised,
        points,
        runningScore: score,
      })
      break // one hit per rule, as CRS rules do not stack against themselves
    }
  }

  return {
    matches,
    score,
    threshold,
    blocked: !engineOff && score >= threshold,
    wouldBlock: score >= threshold,
    engineOff,
  }
}

/**
 * Tests one rule against one value using a caller-supplied transformation
 * pipeline instead of the rule's own — which is what lets the evasion demo
 * switch transformations off and watch the rule stop working.
 */
export function testRule(rule, value, transformIds) {
  const normalised = applyAll(value, transformIds)
  const detector = detectors[rule.detector]
  return {
    normalised,
    matched: Boolean(detector && detector(normalised, rule.detectorArg, { headers: {} })),
  }
}

/** The remediations offered in the tuning lesson. */
export const remediations = [
  {
    id: 'none',
    label: 'Change nothing',
    directive: '# the rule set as shipped',
    blurb: 'The false positive keeps blocking real customers.',
    apply: () => ({}),
  },
  {
    id: 'detection-only',
    label: 'Switch the engine to detection only',
    directive: 'SecRuleEngine DetectionOnly',
    blurb: 'Nothing is blocked any more. Popular at 2am, regretted later.',
    apply: () => ({ engineOff: true }),
  },
  {
    id: 'remove-rule',
    label: 'Remove the rule entirely',
    directive: 'SecRuleRemoveById 942190',
    blurb: 'Fixes the complaint, and removes the protection everywhere else too.',
    apply: () => ({ exclusions: [{ ruleId: '942190' }] }),
  },
  {
    id: 'targeted',
    label: 'Exclude that rule from that one field',
    directive: 'SecRuleUpdateTargetById 942190 "!ARGS:comment"',
    blurb: 'Surgical: the field that legitimately contains SQL stops being inspected by that one rule.',
    apply: () => ({ exclusions: [{ ruleId: '942190', target: 'ARGS:comment' }] }),
  },
]
