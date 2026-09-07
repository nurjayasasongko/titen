/**
 * Level 2: the same ideas as they are actually configured in three places.
 *
 * Numbers here come from vendor documentation — CRS's own docs for the
 * scoring and paranoia model, the AWS WAF developer guide for inspection
 * limits and capacity, and Cloudflare's OWASP ruleset reference for its
 * score thresholds.
 */
export const implementations = [
  {
    id: 'modsec',
    name: 'ModSecurity / Coraza + CRS',
    flavour: 'Open source, runs where you run it',
    summary:
      'The reference implementation, and the one everything in Level 1 was describing. You run the engine inside your web server or reverse proxy and load the Core Rule Set on top of it.',
    docs: {
      label: 'CRS documentation — anomaly scoring',
      url: 'https://coreruleset.org/docs/2-how-crs-works/2-1-anomaly_scoring/',
    },
  },
  {
    id: 'aws',
    name: 'AWS WAF',
    flavour: 'Managed service, attached to a resource',
    summary:
      'A web ACL attached to CloudFront, an Application Load Balancer or an API Gateway. Rules are evaluated in priority order and the first terminating action wins — there is no accumulating score in the core model.',
    docs: {
      label: 'AWS WAF developer guide — request components',
      url: 'https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-fields-list.html',
    },
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare WAF',
    flavour: 'Managed at the edge',
    summary:
      'Managed rulesets applied at the edge before traffic reaches your origin. Its OWASP ruleset keeps the paranoia-level and scoring shape, but on a different numeric scale from CRS.',
    docs: {
      label: 'Cloudflare — OWASP ruleset concepts',
      url: 'https://developers.cloudflare.com/waf/managed-rules/reference/owasp-core-ruleset/concepts/',
    },
  },
]

export const comparison = [
  {
    topic: 'Where it runs',
    lesson: 'sees',
    modsec: ['Inside your web server or proxy', 'nginx, Apache, Envoy — your CPU, your memory'],
    aws: ['Attached to an AWS resource', 'CloudFront, ALB, API Gateway'],
    cloudflare: ['On the edge network', 'in front of your origin, before your infrastructure'],
  },
  {
    topic: 'How a block is decided',
    lesson: 'scoring',
    modsec: ['Accumulated anomaly score', 'rule 949110 blocks when the total reaches the threshold'],
    aws: ['First terminating action wins', 'rules run in priority order; Count does not terminate'],
    cloudflare: ['Accumulated threat score', 'action fires once the summed score crosses the setting'],
  },
  {
    topic: 'Default blocking threshold',
    lesson: 'scoring',
    modsec: ['5 inbound, 4 outbound', 'CRITICAL 5 · ERROR 4 · WARNING 3 · NOTICE 2'],
    aws: ['n/a', 'no score to compare — a Block rule blocks on its own'],
    cloudflare: ['Medium = 40', 'High = 25 · Medium = 40 · Low = 60'],
  },
  {
    topic: 'Aggressiveness dial',
    lesson: 'paranoia',
    modsec: ['tx.paranoia_level, PL1–PL4', 'set in crs-setup.conf by rule 900000'],
    aws: ['Rule groups you add or remove', 'no paranoia concept; you choose managed groups'],
    cloudflare: ['Paranoia level PL1–PL4', 'same shape as CRS, exposed as a dashboard setting'],
  },
  {
    topic: 'Tuning a false positive',
    lesson: 'tuning',
    modsec: ['SecRuleUpdateTargetById', 'exclude one rule from one parameter'],
    aws: ['Override the rule action to Count', 'plus scope-down statements to narrow what is evaluated'],
    cloudflare: ['Ruleset exclusions', 'skip a rule for matching requests, per ruleset'],
  },
  {
    topic: 'How much body it reads',
    lesson: 'phases',
    modsec: ['1 MB by default', 'SecRequestBodyNoFilesLimit = 1048576 bytes'],
    aws: ['8 KB or 16 KB', 'ALB 8 KB; CloudFront 16 KB, raisable to 64 KB'],
    cloudflare: ['Depends on plan', 'check your plan before assuming large bodies are inspected'],
  },
  {
    topic: 'What it costs you',
    lesson: null,
    modsec: ['CPU and memory on your own servers', 'buffering bodies is the expensive part'],
    aws: ['Web ACL capacity units', 'All query parameters +10 WCU; JSON body doubles a rule’s cost'],
    cloudflare: ['Plan tier', 'which managed rulesets you can use at all'],
  },
]
