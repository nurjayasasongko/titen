/**
 * Why the encryption type on a service ticket decides whether the attack
 * works at all.
 *
 * The structural difference is in how the key is derived from the password:
 *
 *   RC4-HMAC (etype 0x17) — the key *is* the NT hash, a single MD4 of the
 *     UTF-16LE password. One guess costs one hash.
 *   AES (etype 0x11 / 0x12) — the key comes from PBKDF2-HMAC-SHA1 with
 *     4096 iterations over the password and a salt. One guess costs 4096.
 *
 * So the ratio between them is not a benchmark, it is the algorithm. The
 * absolute rate depends on the attacker's hardware, which is why it is a
 * slider in the UI rather than a number asserted here.
 */
export const PBKDF2_ITERATIONS = 4096

export const etypes = [
  {
    id: 'rc4',
    hex: '0x17',
    name: 'RC4-HMAC',
    hashcat: 13100,
    hashcatLabel: 'Kerberos 5 TGS-REP etype 23',
    costPerGuess: 1,
    note: 'The key is the account’s NT hash. Every public roasting tool asks for this one.',
  },
  {
    id: 'aes128',
    hex: '0x11',
    name: 'AES128-CTS-HMAC-SHA1-96',
    hashcat: 19600,
    hashcatLabel: 'Kerberos 5 TGS-REP etype 17',
    costPerGuess: PBKDF2_ITERATIONS,
    note: 'Key derivation runs PBKDF2 4096 times, so every guess costs 4096 times as much.',
  },
  {
    id: 'aes256',
    hex: '0x12',
    name: 'AES256-CTS-HMAC-SHA1-96',
    hashcat: 19700,
    hashcatLabel: 'Kerberos 5 TGS-REP etype 18',
    costPerGuess: PBKDF2_ITERATIONS,
    note: 'Same derivation cost as AES128. This and 0x11 are the values Microsoft says to expect.',
  },
]

export const charsets = [
  { id: 'lower', label: 'lowercase only', size: 26 },
  { id: 'mixed', label: 'upper + lower', size: 52 },
  { id: 'alnum', label: 'upper + lower + digits', size: 62 },
  { id: 'full', label: 'full keyboard', size: 95 },
]

export const accountKinds = [
  {
    id: 'user',
    label: 'User account with an SPN',
    length: 10,
    charset: 'alnum',
    note: 'A human chose this password, probably years ago, and it does not rotate.',
    roastable: true,
  },
  {
    id: 'computer',
    label: 'Computer account',
    length: 120,
    charset: 'full',
    note: 'Machine-generated, 120 characters, rotated every 30 days by default.',
    roastable: false,
  },
  {
    id: 'gmsa',
    label: 'Group managed service account',
    length: 240,
    charset: 'full',
    note: 'A 240-character password the domain manages and rotates for you. This is the fix.',
    roastable: false,
  },
]

export function keyspace(length, charsetSize) {
  return Math.pow(charsetSize, length)
}

/** Effective guesses per second once key derivation is paid for. */
export function guessesPerSecond(rawHashesPerSecond, etype) {
  return rawHashesPerSecond / etype.costPerGuess
}

/** Expected time to find the password: half the keyspace, on average. */
export function crackSeconds({ length, charsetSize, rawHashesPerSecond, etype }) {
  const rate = guessesPerSecond(rawHashesPerSecond, etype)
  if (rate <= 0) return Infinity
  return keyspace(length, charsetSize) / 2 / rate
}

const UNITS = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 365],
  ['year', Infinity],
]

export function humanDuration(seconds) {
  if (!Number.isFinite(seconds)) return 'never'
  let value = seconds
  for (const [unit, step] of UNITS) {
    if (value < step) {
      const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value)
      return `${rounded.toLocaleString()} ${unit}${rounded === 1 ? '' : 's'}`
    }
    value /= step
  }
  if (value > 1e12) return `${value.toExponential(1)} years`
  return `${Math.round(value).toLocaleString()} years`
}

/** Anything past this is not a realistic attack path. */
export const SAFE_SECONDS = 60 * 60 * 24 * 365 * 100

export function verdict(seconds) {
  if (seconds < 60 * 60) return { level: 'trivial', text: 'cracked before lunch' }
  if (seconds < 60 * 60 * 24 * 7) return { level: 'likely', text: 'cracked within the week' }
  if (seconds < SAFE_SECONDS) return { level: 'slow', text: 'possible, given patience' }
  return { level: 'safe', text: 'not a realistic attack path' }
}
