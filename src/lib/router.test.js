import { describe, expect, it } from 'vitest'
import { formatHash, parseHash } from './router.js'

describe('parseHash', () => {
  it('reads an empty hash as the home route', () => {
    for (const hash of ['', '#', '#/', undefined, null]) {
      expect(parseHash(hash)).toEqual([])
    }
  })

  it('splits a module route into segments', () => {
    expect(parseHash('#/siem/learn/parse')).toEqual(['siem', 'learn', 'parse'])
  })

  it('ignores leading, trailing and doubled slashes', () => {
    expect(parseHash('#//siem//products/')).toEqual(['siem', 'products'])
  })

  it('decodes escaped segments', () => {
    expect(parseHash('#/siem/products/splunk/incident%2Dreview')).toEqual([
      'siem',
      'products',
      'splunk',
      'incident-review',
    ])
  })
})

describe('formatHash', () => {
  it('builds a route from segments', () => {
    expect(formatHash(['siem', 'learn', 'parse'])).toBe('#/siem/learn/parse')
  })

  it('drops empty segments rather than emitting //', () => {
    expect(formatHash(['siem', null, 'products', undefined, ''])).toBe('#/siem/products')
  })

  it('returns the home route for nothing at all', () => {
    expect(formatHash([])).toBe('#/')
    expect(formatHash()).toBe('#/')
  })
})

describe('round trip', () => {
  it.each([
    [[]],
    [['siem']],
    [['siem', 'learn', 'correlate']],
    [['siem', 'products', 'wazuh', 'analysisd']],
  ])('survives %j', (segments) => {
    expect(parseHash(formatHash(segments))).toEqual(segments)
  })
})
