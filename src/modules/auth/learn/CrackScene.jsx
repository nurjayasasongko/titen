import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  accountKinds,
  charsets,
  crackSeconds,
  etypes,
  humanDuration,
  verdict,
} from '../lib/cracking.js'
import { wordlists } from '../data/wordlists.js'

const RIG = 5e10 // "a serious rig", fixed so the scene has one honest rate

/**
 * Kerberoasting as a physical object: a padlock you walked off with, and you
 * trying keys against it at home. The lock's stamp is the encryption type;
 * the ring of keys is the password's entropy. Both are visible, both are
 * things you can change, and the lock either pops or it doesn't.
 */
export default function CrackScene() {
  const [accountId, setAccountId] = useState('user')
  const [etypeId, setEtypeId] = useState('rc4')
  const [phase, setPhase] = useState('idle') // idle | cracking | open | stuck
  const [tried, setTried] = useState(0)
  const [guessIndex, setGuessIndex] = useState(0)
  const timers = useRef([])

  const account = accountKinds.find((a) => a.id === accountId)
  const etype = etypes.find((e) => e.id === etypeId)
  const list = wordlists[accountId]
  const charsetSize = charsets.find((c) => c.id === account.charset).size

  const seconds = crackSeconds({
    length: account.length,
    charsetSize,
    rawHashesPerSecond: RIG,
    etype,
  })
  const outcome = verdict(seconds)
  const willOpen = account.roastable && etype.id === 'rc4' && outcome.level !== 'safe'

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function reset() {
    clearTimers()
    setPhase('idle')
    setTried(0)
    setGuessIndex(0)
  }

  useEffect(() => reset, [accountId, etypeId])
  useEffect(() => () => clearTimers(), [])

  function start() {
    clearTimers()
    setPhase('cracking')
    setTried(0)
    setGuessIndex(0)

    // one visible "try" every so often; AES visibly grinds slower per guess
    const perGuessMs = etype.id === 'rc4' ? 340 : 900
    const visibleTries = willOpen ? list.hitIndex + 1 : 7

    for (let i = 0; i < visibleTries; i += 1) {
      timers.current.push(
        setTimeout(() => {
          setGuessIndex(i)
          // the counter jumps by the real effective rate, dramatised
          setTried((t) => t + (etype.id === 'rc4' ? 900 + i * 300 : 1))
        }, i * perGuessMs),
      )
    }

    timers.current.push(
      setTimeout(
        () => setPhase(willOpen ? 'open' : 'stuck'),
        visibleTries * perGuessMs + 300,
      ),
    )
  }

  const isHit = phase === 'open'

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          You walked off with a locked box. Now try to open it.
        </h2>
        <p className="mt-0.5 max-w-2xl text-xs text-slate-600 dark:text-slate-400">
          A Kerberos service ticket is a box locked with the service account’s key. The KDC
          handed it to you for the asking. Two things decide whether you can open it at
          home: the <em>lock</em> stamped on it (the encryption type) and the ring of{' '}
          <em>keys</em> worth trying (how guessable the password is).
        </p>
      </header>

      {/* the two dials, framed as physical choices */}
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Whose box did the KDC hand you?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {accountKinds.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccountId(a.id)}
                aria-pressed={a.id === accountId}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  a.id === accountId
                    ? 'border-sky-500 bg-sky-50 text-slate-900 dark:border-sky-500 dark:bg-sky-950 dark:text-slate-100'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                }`}
              >
                {a.label.split(' ')[0]} {a.label.includes('Computer') ? 'account' : a.label.includes('managed') ? '(gMSA)' : 'account'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            What lock is stamped on it?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {etypes.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEtypeId(e.id)}
                aria-pressed={e.id === etypeId}
                className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-medium transition-colors ${
                  e.id === etypeId
                    ? 'border-sky-500 bg-sky-50 text-slate-900 dark:border-sky-500 dark:bg-sky-950 dark:text-slate-100'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                }`}
              >
                {e.hex} {e.name.split('-')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* the scene */}
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        {/* the keyring you are trying */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Keys you’re trying
          </p>
          <p className="mb-2 text-[10px] text-slate-500 dark:text-slate-500">{list.label}</p>
          <div className="space-y-1">
            {list.guesses.slice(0, 5).map((guess, index) => {
              const active = phase === 'cracking' && index === Math.min(guessIndex, 4)
              const rejected =
                (phase === 'cracking' && index < guessIndex) ||
                (phase === 'stuck' && index < 5)
              const hit = isHit && index === Math.min(list.hitIndex, 4) && account.roastable
              return (
                <div
                  key={guess}
                  className={`flex items-center justify-between gap-2 rounded border px-2 py-1 font-mono text-[10px] transition-colors ${
                    hit
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-200'
                      : active
                        ? 'border-sky-400 bg-white text-slate-900 dark:border-sky-600 dark:bg-slate-950 dark:text-slate-100'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500'
                  }`}
                >
                  <span className="truncate">{guess}</span>
                  <span>{hit ? '✓' : rejected ? '✕' : active ? '…' : ''}</span>
                </div>
              )
            })}
            {!account.roastable ? (
              <p className="pt-1 text-center font-mono text-[10px] text-slate-400 dark:text-slate-600">
                …and {account.length === 120 ? '10¹⁸⁰' : '10³⁶⁰'} more you’ll never reach
              </p>
            ) : null}
          </div>
        </div>

        {/* the lock */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 120 150" className="h-40 w-32">
            {/* shackle */}
            <motion.path
              d="M35 60 V42 a25 25 0 0 1 50 0 V60"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              className={isHit ? 'stroke-emerald-500' : 'stroke-slate-400 dark:stroke-slate-500'}
              animate={
                isHit
                  ? { d: 'M35 60 V42 a25 25 0 0 1 50 0 V30', x: 14, y: -8, rotate: 8 }
                  : phase === 'cracking'
                    ? { x: [0, -1.5, 1.5, 0] }
                    : { x: 0 }
              }
              transition={
                phase === 'cracking' && !isHit
                  ? { duration: 0.18, repeat: Infinity }
                  : { duration: 0.5 }
              }
            />
            {/* body */}
            <rect
              x="24"
              y="60"
              width="72"
              height="60"
              rx="10"
              className={
                isHit
                  ? 'fill-emerald-500'
                  : phase === 'stuck'
                    ? 'fill-slate-500 dark:fill-slate-600'
                    : 'fill-slate-700 dark:fill-slate-600'
              }
            />
            {/* etype stamp */}
            <text x="60" y="86" textAnchor="middle" className="fill-white font-mono text-[10px] font-bold">
              {etype.hex}
            </text>
            <text x="60" y="99" textAnchor="middle" className="fill-white/70 font-mono text-[7px]">
              {etype.name.split('-')[0]}
            </text>
            {/* keyhole */}
            <circle cx="60" cy="110" r="5" className="fill-slate-900/50" />
          </svg>

          {/* per-guess cost — the crank */}
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <motion.span
              animate={phase === 'cracking' ? { rotate: 360 } : {}}
              transition={{ duration: etype.id === 'rc4' ? 0.4 : 1.6, repeat: Infinity, ease: 'linear' }}
              className="inline-block"
            >
              ⚙
            </motion.span>
            <span className="font-mono">
              {etype.costPerGuess === 1 ? '1 turn / guess' : '4096 turns / guess'}
            </span>
          </div>
        </div>

        {/* the readout */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            At {RIG.toExponential(0)} hashes/sec
          </p>
          <dl className="mt-1.5 space-y-1 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">keys tried</dt>
              <dd className="font-mono font-bold text-slate-900 dark:text-slate-50">
                {tried.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">to exhaust it</dt>
              <dd className="font-mono font-bold text-slate-900 dark:text-slate-50">
                {humanDuration(seconds)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={phase === 'cracking' ? reset : start}
            className={`mt-2.5 w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors ${
              phase === 'cracking'
                ? 'bg-slate-500 hover:bg-slate-600'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {phase === 'cracking' ? 'Stop' : phase === 'idle' ? 'Try the keys' : 'Again'}
          </button>
        </div>
      </div>

      {/* the verdict */}
      <AnimatePresence mode="wait">
        {phase === 'open' ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3 dark:border-emerald-600 dark:bg-emerald-950/50"
          >
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              Open. The password was <span className="font-mono">{list.real}</span>.
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-800 dark:text-emerald-300">
              A flimsy RC4 lock and a password a person chose. This is the whole attack — and
              nothing on the network saw you do it.
            </p>
          </motion.div>
        ) : phase === 'stuck' ? (
          <motion.div
            key="stuck"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-lg border-2 border-slate-300 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Still locked{seconds > 3.15e9 ? ' — and it will be for ' + humanDuration(seconds) : ''}.
            </p>
            <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
              {!account.roastable
                ? 'The password is a long random string the domain rotates. There is no ring of keys worth trying — this box is not a target, whatever lock is on it.'
                : 'AES turns every single guess into 4096 turns of the crank. The keyring is the same, but you will not live long enough to finish it.'}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Change one dial at a time. Same box, RC4 → AES: the keys you try never change, but the
        crank goes from 1 turn to 4096 per guess. Same lock, user account → gMSA: the crank is
        identical, but the ring of keys becomes one you could never finish. Kerberoasting needs{' '}
        <span className="font-medium text-slate-700 dark:text-slate-300">both</span> a cheap lock
        and a guessable key. Take away either and the box is safe to hand out.
      </p>
    </section>
  )
}
