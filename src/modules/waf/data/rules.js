/**
 * A working subset of the OWASP Core Rule Set.
 *
 * Rule IDs, messages, severities, paranoia levels and the files they live
 * in are taken verbatim from the CRS source. The `detector` is a simplified
 * stand-in for what the real rule uses (libinjection, or a long CRS regex) —
 * enough to demonstrate the mechanism honestly without shipping a WAF.
 */

/** CRS severity → anomaly score. Set in crs-setup.conf by rule 900110. */
export const severityScore = {
  CRITICAL: 5,
  ERROR: 4,
  WARNING: 3,
  NOTICE: 2,
}

/** Rule 900110 defaults. The inbound one is what blocks a request. */
export const defaultThresholds = {
  inbound: 5,
  outbound: 4,
}

export const rules = [
  {
    id: '941100',
    msg: 'XSS Attack Detected via libinjection',
    severity: 'CRITICAL',
    paranoia: 1,
    phase: 2,
    targets: ['ARGS', 'REQUEST_HEADERS:User-Agent'],
    transforms: ['urlDecodeUni', 'htmlEntityDecode', 'lowercase'],
    detector: 'xss',
    file: 'REQUEST-941-APPLICATION-ATTACK-XSS.conf',
  },
  {
    id: '942100',
    msg: 'SQL Injection Attack Detected via libinjection',
    severity: 'CRITICAL',
    paranoia: 1,
    phase: 2,
    targets: ['ARGS', 'REQUEST_HEADERS:User-Agent'],
    transforms: ['urlDecodeUni', 'removeNulls', 'lowercase'],
    detector: 'sqli',
    file: 'REQUEST-942-APPLICATION-ATTACK-SQLI.conf',
  },
  {
    id: '942190',
    msg: 'Detects SQL code execution and information gathering attempts',
    severity: 'CRITICAL',
    paranoia: 1,
    phase: 2,
    targets: ['ARGS'],
    transforms: ['urlDecodeUni', 'removeCommentsChar', 'lowercase'],
    detector: 'sqlKeywords',
    file: 'REQUEST-942-APPLICATION-ATTACK-SQLI.conf',
  },
  {
    id: '942130',
    msg: 'SQL Injection Attack: SQL Boolean-based attack detected',
    severity: 'CRITICAL',
    paranoia: 2,
    phase: 2,
    targets: ['ARGS'],
    transforms: ['urlDecodeUni', 'replaceComments', 'lowercase'],
    detector: 'booleanSqli',
    file: 'REQUEST-942-APPLICATION-ATTACK-SQLI.conf',
  },
  {
    id: '913100',
    msg: 'Found User-Agent associated with security scanner',
    severity: 'CRITICAL',
    paranoia: 1,
    phase: 1,
    targets: ['REQUEST_HEADERS:User-Agent'],
    transforms: ['lowercase'],
    detector: 'scannerUserAgent',
    file: 'REQUEST-913-SCANNER-DETECTION.conf',
  },
  {
    id: '942430',
    msg: 'Restricted SQL Character Anomaly Detection (args): # of special characters exceeded (12)',
    severity: 'WARNING',
    paranoia: 2,
    phase: 2,
    targets: ['ARGS'],
    transforms: ['urlDecodeUni'],
    detector: 'specialChars',
    detectorArg: 12,
    file: 'REQUEST-942-APPLICATION-ATTACK-SQLI.conf',
  },
  {
    id: '942431',
    msg: 'Restricted SQL Character Anomaly Detection (args): # of special characters exceeded (6)',
    severity: 'WARNING',
    paranoia: 3,
    phase: 2,
    targets: ['ARGS'],
    transforms: ['urlDecodeUni'],
    detector: 'specialChars',
    detectorArg: 6,
    file: 'REQUEST-942-APPLICATION-ATTACK-SQLI.conf',
  },
  {
    id: '942432',
    msg: 'Restricted SQL Character Anomaly Detection (args): # of special characters exceeded (2)',
    severity: 'WARNING',
    paranoia: 4,
    phase: 2,
    targets: ['ARGS'],
    transforms: ['urlDecodeUni'],
    detector: 'specialChars',
    detectorArg: 2,
    file: 'REQUEST-942-APPLICATION-ATTACK-SQLI.conf',
  },
  {
    id: '920300',
    msg: 'Request Missing an Accept Header',
    severity: 'NOTICE',
    paranoia: 3,
    phase: 1,
    targets: ['&REQUEST_HEADERS:Accept'],
    transforms: [],
    detector: 'missingHeader',
    detectorArg: 'Accept',
    file: 'REQUEST-920-PROTOCOL-ENFORCEMENT.conf',
  },
]

export const paranoiaLevels = [
  {
    level: 1,
    label: 'PL1',
    name: 'Baseline',
    blurb: 'Baseline security with a minimal need to tune away false positives. The default.',
    risk: 'Risk class 0 — no personal data at stake.',
  },
  {
    level: 2,
    label: 'PL2',
    name: 'Real user data',
    blurb: 'Adequate when real user data is involved. Some false positives are expected.',
    risk: 'Risk class 1 — personal data such as names.',
  },
  {
    level: 3,
    label: 'PL3',
    name: 'Online banking',
    blurb: 'Online banking level security, with lots of false positives.',
    risk: 'Risk class 2 — sensitive financial data.',
  },
  {
    level: 4,
    label: 'PL4',
    name: 'Crown jewels',
    blurb: 'Maximum aggression. Adequate to protect the crown jewels, at substantial tuning cost.',
    risk: 'Expect weeks of tuning before this is usable.',
  },
]

export function rulesAtParanoia(level) {
  return rules.filter((rule) => rule.paranoia <= level)
}
