import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  accountKinds,
  charsets,
  crackSeconds,
  etypes,
  guessesPerSecond,
  humanDuration,
  verdict,
} from '../lib/cracking.js'

const rigs = [
  { label: 'a gaming PC', rate: 1e9 },
  { label: 'a serious rig', rate: 5e10 },
  { label: 'a rented cluster', rate: 1e12 },
]

const verdictTone = {
  trivial: 'border-rose-500 bg-rose-100 text-rose-900 dark:border-rose-600 dark:bg-rose-950 dark:text-rose-200',
  likely: 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
  slow: 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
  safe: 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
}

/** Lesson 4: the calculator that shows why RC4 and a human password matter. */
export default function RoastDemo() {
  const [accountId, setAccountId] = useState('user')
  const [etypeId, setEtypeId] = useState('rc4')
  const [rigRate, setRigRate] = useState(1e9)

  const account = accountKinds.find((entry) => entry.id === accountId)
  const etype = etypes.find((entry) => entry.id === etypeId)
  const charsetSize = charsets.find((entry) => entry.id === account.charset).size

  const seconds = crackSeconds({
    length: account.length,
    charsetSize,
    rawHashesPerSecond: rigRate,
    etype,
  })
  const rc4Seconds = crackSeconds({
    length: account.length,
    charsetSize,
    rawHashesPerSecond: rigRate,
    etype: etypes.find((e) => e.id === 'rc4'),
  })
  const outcome = verdict(seconds)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Whose ticket did you grab?
          </p>
          <div className="space-y-1.5">
            {accountKinds.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setAccountId(entry.id)}
                aria-pressed={entry.id === accountId}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                  entry.id === accountId
                    ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                    : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
                }`}
              >
                <span className="block text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                  {entry.label}
                </span>
                <span className="block font-mono text-[9px] text-slate-500 dark:text-slate-400">
                  {entry.length} chars · {charsets.find((c) => c.id === entry.charset).label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Encryption type you requested
          </p>
          <div className="space-y-1.5">
            {etypes.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setEtypeId(entry.id)}
                aria-pressed={entry.id === etypeId}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                  entry.id === etypeId
                    ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                    : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
                }`}
              >
                <span className="block font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                  {entry.hex} {entry.name.split('-')[0]}
                </span>
                <span className="block font-mono text-[9px] text-slate-500 dark:text-slate-400">
                  hashcat -m {entry.hashcat} · {entry.costPerGuess}× per guess
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Cracking on…
          </p>
          <div className="space-y-1.5">
            {rigs.map((rig) => (
              <button
                key={rig.label}
                type="button"
                onClick={() => setRigRate(rig.rate)}
                aria-pressed={rigRate === rig.rate}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                  rigRate === rig.rate
                    ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                    : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
                }`}
              >
                <span className="block text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                  {rig.label}
                </span>
                <span className="block font-mono text-[9px] text-slate-500 dark:text-slate-400">
                  {rig.rate.toExponential(0)} raw H/s
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        key={`${accountId}-${etypeId}-${rigRate}`}
        initial={{ scale: 0.98, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-xl border-2 p-4 text-center ${verdictTone[outcome.level]}`}
      >
        <p className="text-[11px] tracking-wide uppercase opacity-80">
          expected time to recover the password
        </p>
        <p className="mt-1 font-mono text-2xl font-bold sm:text-3xl">{humanDuration(seconds)}</p>
        <p className="mt-1 text-sm font-semibold">{outcome.text}</p>
      </motion.div>

      <div className="grid gap-2 sm:grid-cols-3 text-[11px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">effective guesses/sec</p>
          <p className="font-mono font-bold text-slate-900 dark:text-slate-50">
            {guessesPerSecond(rigRate, etype).toExponential(1)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">AES vs RC4 here</p>
          <p className="font-mono font-bold text-slate-900 dark:text-slate-50">
            {seconds === rc4Seconds ? '— (this is RC4)' : `${Math.round(seconds / rc4Seconds).toLocaleString()}× slower`}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">roastable at all?</p>
          <p className={`font-bold ${account.roastable ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {account.roastable ? 'yes — has an SPN, human password' : 'no — password is machine-managed'}
          </p>
        </div>
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {account.note} {etype.note} Set it to the user account on RC4 and even a gaming PC
        wins; switch that one dropdown to AES and the same PC needs {humanDuration(
          crackSeconds({ length: account.length, charsetSize, rawHashesPerSecond: 1e9, etype: etypes.find((e) => e.id === 'aes256') }),
        )}. The account never changed — only which encryption type it was willing to hand out.
      </p>
    </div>
  )
}
