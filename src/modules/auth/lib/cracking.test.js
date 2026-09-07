import { describe, expect, it } from 'vitest'
import {
  PBKDF2_ITERATIONS,
  accountKinds,
  charsets,
  crackSeconds,
  etypes,
  guessesPerSecond,
  humanDuration,
  keyspace,
  verdict,
} from './cracking.js'

const rc4 = etypes.find((etype) => etype.id === 'rc4')
const aes256 = etypes.find((etype) => etype.id === 'aes256')
const RIG = 1e9

describe('the encryption types', () => {
  it('carry the hashcat modes those etypes actually use', () => {
    expect(rc4.hashcat).toBe(13100)
    expect(etypes.find((e) => e.id === 'aes128').hashcat).toBe(19600)
    expect(aes256.hashcat).toBe(19700)
  })

  it('price RC4 at one hash per guess and AES at the PBKDF2 iteration count', () => {
    expect(rc4.costPerGuess).toBe(1)
    expect(aes256.costPerGuess).toBe(PBKDF2_ITERATIONS)
  })
})

describe('crack time', () => {
  it('grows with the alphabet and with the length', () => {
    const base = { charsetSize: 26, rawHashesPerSecond: RIG, etype: rc4 }
    expect(crackSeconds({ ...base, length: 9 })).toBeGreaterThan(
      crackSeconds({ ...base, length: 8 }),
    )
    expect(crackSeconds({ ...base, length: 8, charsetSize: 95 })).toBeGreaterThan(
      crackSeconds({ ...base, length: 8 }),
    )
  })

  it('is exactly 4096 times slower against AES than against RC4', () => {
    const args = { length: 8, charsetSize: 62, rawHashesPerSecond: RIG }
    const ratio =
      crackSeconds({ ...args, etype: aes256 }) / crackSeconds({ ...args, etype: rc4 })
    expect(ratio).toBeCloseTo(PBKDF2_ITERATIONS)
  })

  it('halves when the attacker doubles their hardware', () => {
    const args = { length: 8, charsetSize: 62, etype: rc4 }
    expect(crackSeconds({ ...args, rawHashesPerSecond: 2 * RIG })).toBeCloseTo(
      crackSeconds({ ...args, rawHashesPerSecond: RIG }) / 2,
    )
  })

  it('returns never rather than dividing by zero on an idle rig', () => {
    expect(crackSeconds({ length: 8, charsetSize: 62, rawHashesPerSecond: 0, etype: rc4 })).toBe(
      Infinity,
    )
    expect(humanDuration(Infinity)).toBe('never')
  })
})

describe('the account kinds behave the way the fix claims', () => {
  const size = (id) => charsets.find((charset) => charset.id === id).size

  it.each(accountKinds.filter((kind) => !kind.roastable).map((k) => [k.id, k]))(
    '%s is out of reach even against RC4 on a huge rig',
    (_id, kind) => {
      const seconds = crackSeconds({
        length: kind.length,
        charsetSize: size(kind.charset),
        rawHashesPerSecond: 1e15,
        etype: rc4,
      })
      expect(verdict(seconds).level).toBe('safe')
    },
  )

  it('a human-chosen service account password is the one that falls', () => {
    const user = accountKinds.find((kind) => kind.id === 'user')
    const seconds = crackSeconds({
      length: user.length,
      charsetSize: size(user.charset),
      rawHashesPerSecond: RIG,
      etype: rc4,
    })
    expect(verdict(seconds).level).not.toBe('safe')
  })

  it('and moving that same account to AES buys real time', () => {
    const user = accountKinds.find((kind) => kind.id === 'user')
    const args = { length: user.length, charsetSize: size(user.charset), rawHashesPerSecond: RIG }
    expect(crackSeconds({ ...args, etype: aes256 })).toBeGreaterThan(
      crackSeconds({ ...args, etype: rc4 }),
    )
  })
})

describe('humanDuration', () => {
  it.each([
    [30, 'seconds'],
    [3600 * 5, 'hours'],
    [86400 * 3, 'days'],
    [86400 * 800, 'years'],
  ])('formats %i seconds with a sensible unit', (seconds, unit) => {
    expect(humanDuration(seconds)).toContain(unit.slice(0, -1))
  })
})

describe('keyspace and rate helpers', () => {
  it('keyspace is charset to the power of length', () => {
    expect(keyspace(3, 10)).toBe(1000)
  })

  it('guessesPerSecond divides the rig by the derivation cost', () => {
    expect(guessesPerSecond(4096, aes256)).toBe(1)
  })
})
