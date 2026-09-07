import { describe, expect, it } from 'vitest'
import {
  effectiveLimitKb,
  inspectionLimits,
  isInspected,
  oversizeHandling,
  verdictFor,
} from './limits.js'

const alb = inspectionLimits.find((limit) => limit.id === 'aws-alb')
const cloudfront = inspectionLimits.find((limit) => limit.id === 'aws-cf')
const modsec = inspectionLimits.find((limit) => limit.id === 'modsec')

describe('the documented limits', () => {
  it('matches the AWS WAF numbers', () => {
    expect(alb.limitKb).toBe(8)
    expect(cloudfront.limitKb).toBe(16)
    expect(cloudfront.maxKb).toBe(64)
  })

  it('matches the ModSecurity default of 1048576 bytes', () => {
    expect(modsec.limitKb * 1024).toBe(1048576)
  })

  it('offers exactly the three AWS oversize behaviours', () => {
    expect(oversizeHandling.map((item) => item.id).sort()).toEqual([
      'CONTINUE',
      'MATCH',
      'NO_MATCH',
    ])
  })
})

describe('what gets inspected', () => {
  it('sees a payload inside the limit', () => {
    expect(isInspected(alb, 4)).toBe(true)
  })

  it('does not see a payload past it', () => {
    expect(isInspected(alb, 12)).toBe(false)
  })

  it('treats the boundary as exclusive — a payload starting at the limit is outside', () => {
    expect(isInspected(alb, 8)).toBe(false)
    expect(isInspected(alb, 7.9)).toBe(true)
  })

  it('raising the CloudFront limit genuinely extends what is inspected', () => {
    expect(isInspected(cloudfront, 40)).toBe(false)
    expect(40 < effectiveLimitKb(cloudfront, true)).toBe(true)
  })
})

describe('verdicts', () => {
  it('detects a payload the engine actually buffered, whatever the handling', () => {
    for (const handling of oversizeHandling) {
      expect(verdictFor(alb, 2, handling.id).outcome).toBe('detected')
    }
  })

  it('misses it silently under CONTINUE and NO_MATCH', () => {
    expect(verdictFor(alb, 20, 'CONTINUE').outcome).toBe('missed')
    expect(verdictFor(alb, 20, 'NO_MATCH').outcome).toBe('missed')
  })

  it('flags it under MATCH — without ever having seen it', () => {
    const verdict = verdictFor(alb, 20, 'MATCH')
    expect(verdict.inspected).toBe(false)
    expect(verdict.outcome).toBe('flagged-blindly')
  })

  it('a payload past every limit is missed by every implementation', () => {
    for (const limit of inspectionLimits) {
      expect(verdictFor(limit, 5000, 'CONTINUE').outcome).toBe('missed')
    }
  })
})
