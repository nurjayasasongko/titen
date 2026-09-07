import { describe, expect, it } from 'vitest'
import { collectTargets, evaluate, remediations, testRule } from './engine.js'
import { defaultThresholds, rules, severityScore } from '../data/rules.js'
import { getRequest, requests } from '../data/requests.js'

const attack = getRequest('obvious-attack')
const evasive = getRequest('evasive-attack')
const probe = getRequest('schema-probe')
const ticket = getRequest('support-ticket')
const chatty = getRequest('chatty-customer')

describe('CRS constants match the published defaults', () => {
  it('maps severity to anomaly score the way crs-setup.conf does', () => {
    expect(severityScore).toEqual({ CRITICAL: 5, ERROR: 4, WARNING: 3, NOTICE: 2 })
  })

  it('uses the documented inbound and outbound thresholds', () => {
    expect(defaultThresholds).toEqual({ inbound: 5, outbound: 4 })
  })

  it('never assigns a rule a paranoia level outside 1-4', () => {
    for (const rule of rules) {
      expect(rule.paranoia).toBeGreaterThanOrEqual(1)
      expect(rule.paranoia).toBeLessThanOrEqual(4)
      expect(severityScore[rule.severity]).toBeGreaterThan(0)
    }
  })
})

describe('collectTargets', () => {
  it('expands ARGS into one entry per parameter', () => {
    const rule = rules.find((item) => item.id === '942430')
    expect(collectTargets(rule, ticket).map((entry) => entry.target)).toEqual([
      'ARGS:subject',
      'ARGS:comment',
    ])
  })

  it('skips a header the request does not have', () => {
    const rule = rules.find((item) => item.id === '913100')
    const headerless = { ...attack, headers: {} }
    expect(collectTargets(rule, headerless)).toEqual([])
  })
})

describe('the obvious attack', () => {
  const result = evaluate(attack, { paranoiaLevel: 1 })

  it('is blocked at the default paranoia level and threshold', () => {
    expect(result.blocked).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(defaultThresholds.inbound)
  })

  it('is caught by the SQL injection rule and the scanner rule', () => {
    const ids = result.matches.map((match) => match.rule.id)
    expect(ids).toContain('942100')
    expect(ids).toContain('913100')
  })

  it('adds up exactly: two CRITICAL rules is ten points', () => {
    const critical = result.matches.filter((m) => m.rule.severity === 'CRITICAL')
    expect(result.score).toBe(
      result.matches.reduce((total, match) => total + match.points, 0),
    )
    expect(critical.length * 5).toBeLessThanOrEqual(result.score)
  })
})

describe('the evasive attack — the whole reason transformations exist', () => {
  it('is still caught at the default level, because rules normalise before matching', () => {
    const result = evaluate(evasive, { paranoiaLevel: 1 })
    expect(result.blocked).toBe(true)
    expect(result.matches[0].raw).not.toBe(result.matches[0].normalised)
  })

  it('would sail through a rule set that matched raw bytes', () => {
    const naive = rules
      .filter((rule) => rule.id === '942100')
      .map((rule) => ({ ...rule, transforms: [] }))
    expect(evaluate(evasive, { paranoiaLevel: 1, ruleset: naive }).blocked).toBe(false)
  })

  it('and the same naive rule set still catches the un-hidden version', () => {
    const naive = rules
      .filter((rule) => rule.id === '942100')
      .map((rule) => ({ ...rule, transforms: [] }))
    expect(evaluate(attack, { paranoiaLevel: 1, ruleset: naive }).matches.length).toBe(1)
  })
})

describe('paranoia levels trade false negatives for false positives', () => {
  it('leaves the chatty customer alone at the default level', () => {
    expect(evaluate(chatty, { paranoiaLevel: 1 }).blocked).toBe(false)
    expect(evaluate(chatty, { paranoiaLevel: 2 }).blocked).toBe(false)
  })

  it('starts blocking that same innocent customer as the level rises', () => {
    expect(evaluate(chatty, { paranoiaLevel: 3 }).blocked).toBe(true)
    expect(evaluate(chatty, { paranoiaLevel: 4 }).blocked).toBe(true)
  })

  it('never lowers the score when the level goes up', () => {
    let previous = 0
    for (const level of [1, 2, 3, 4]) {
      const score = evaluate(chatty, { paranoiaLevel: level }).score
      expect(score).toBeGreaterThanOrEqual(previous)
      previous = score
    }
  })

  it('blocks the real attack at every level, including the default', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(evaluate(attack, { paranoiaLevel: level }).blocked).toBe(true)
    }
  })
})

describe('the false positive, and the attack it is tangled up with', () => {
  it('blocks a genuine support ticket at the default paranoia level', () => {
    const result = evaluate(ticket, { paranoiaLevel: 1 })
    expect(result.blocked).toBe(true)
    expect(result.matches.map((match) => match.rule.id)).toEqual(['942190'])
  })

  it('catches the quiet enumeration attack with that very same rule', () => {
    const result = evaluate(probe, { paranoiaLevel: 1 })
    expect(result.blocked).toBe(true)
    expect(result.matches.map((match) => match.rule.id)).toEqual(['942190'])
  })

  it('so nothing separates them except which field the text arrived in', () => {
    const ticketMatch = evaluate(ticket, { paranoiaLevel: 1 }).matches[0]
    const probeMatch = evaluate(probe, { paranoiaLevel: 1 }).matches[0]
    expect(ticketMatch.rule.id).toBe(probeMatch.rule.id)
    expect(ticketMatch.target).not.toBe(probeMatch.target)
  })

  it('is not fixable by lowering the paranoia level — there is nothing below PL1', () => {
    expect(evaluate(ticket, { paranoiaLevel: 1 }).blocked).toBe(true)
  })
})

describe('the four remediations, judged on both requests at once', () => {
  const verdicts = Object.fromEntries(
    remediations.map((remediation) => {
      const options = { paranoiaLevel: 1, ...remediation.apply() }
      return [
        remediation.id,
        {
          ticket: evaluate(ticket, options).blocked,
          attack: evaluate(probe, options).blocked,
        },
      ]
    }),
  )

  it('changing nothing keeps blocking the customer', () => {
    expect(verdicts.none).toEqual({ ticket: true, attack: true })
  })

  it('detection-only unblocks the customer and the attacker together', () => {
    expect(verdicts['detection-only']).toEqual({ ticket: false, attack: false })
  })

  it('deleting the rule globally also lets the attack through', () => {
    expect(verdicts['remove-rule']).toEqual({ ticket: false, attack: false })
  })

  it('only the targeted exclusion fixes one without breaking the other', () => {
    expect(verdicts.targeted).toEqual({ ticket: false, attack: true })
  })
})

describe('every sample request is self-consistent', () => {
  it.each(requests.map((request) => [request.id, request]))('%s', (_id, request) => {
    expect(['attack', 'legitimate']).toContain(request.intent)
    expect(Object.keys(request.args).length).toBeGreaterThan(0)
    expect(request.headers.Host).toBeTruthy()
  })
})

describe('testRule — the evasion demo’s engine', () => {
  const sqli = rules.find((rule) => rule.id === '942100')
  const boolean = rules.find((rule) => rule.id === '942130')
  const encoded = '%27%20oR%201%3D1%20%2D%2D'
  const commented = "'/**/oR/**/1=1--"

  it('misses an encoded payload with no transformations at all', () => {
    expect(testRule(sqli, encoded, []).matched).toBe(false)
  })

  it('catches it once the payload is decoded and case-folded', () => {
    const result = testRule(sqli, encoded, ['urlDecodeUni', 'lowercase'])
    expect(result.matched).toBe(true)
    expect(result.normalised).toBe("' or 1=1 --")
  })

  it('needs replaceComments for the comment-injected variant', () => {
    expect(testRule(boolean, commented, ['lowercase']).matched).toBe(false)
    expect(testRule(boolean, commented, ['replaceComments', 'lowercase']).matched).toBe(true)
  })

  it('removeCommentsChar is not a substitute — it glues the keywords together', () => {
    const glued = testRule(boolean, "1/**/or/**/1=1", ['removeCommentsChar', 'lowercase'])
    expect(glued.normalised).toBe('1or1=1')
    expect(glued.matched).toBe(false)
  })
})
