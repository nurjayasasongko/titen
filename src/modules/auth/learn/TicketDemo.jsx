import { useState } from 'react'
import { motion } from 'framer-motion'
import { spns } from '../data/events.js'

const openers = [
  { id: 'you', label: 'as j.reyes', holds: 'your session key' },
  { id: 'svc', label: 'as the service', holds: 'the service account’s key' },
  { id: 'kdc', label: 'as the KDC', holds: 'every key in the domain' },
]

const halves = [
  {
    id: 'client-part',
    title: 'Part one — for you',
    sealedWith: 'your session key',
    contents: ['the session key to use with this service', 'ticket start and end times', 'the SPN you asked for'],
    openableBy: ['you', 'kdc'],
  },
  {
    id: 'ticket-part',
    title: 'Part two — the ticket itself',
    sealedWith: 'the service account’s key',
    contents: ['your SID and group memberships (the PAC)', 'the same session key, for the service', 'validity times'],
    openableBy: ['svc', 'kdc'],
  },
]

/** Lesson 3: the two halves of a TGS-REP, and who holds which key. */
export default function TicketDemo() {
  const [opener, setOpener] = useState('you')
  const [spn, setSpn] = useState(spns[0].spn)
  const chosen = spns.find((entry) => entry.spn === spn)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Ask the KDC for a ticket for any service in the domain
        </p>
        <select
          value={spn}
          onChange={(event) => setSpn(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        >
          {spns.map((entry) => (
            <option key={entry.spn} value={entry.spn}>
              {entry.spn} — runs as {entry.account}
            </option>
          ))}
        </select>
        <p className="mt-1.5 rounded bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          KDC: issued. Status 0x0 — it never asked whether you should be talking to this
          service.
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Try to open the reply…
        </p>
        <div className="flex flex-wrap gap-1.5">
          {openers.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setOpener(entry.id)}
              aria-pressed={entry.id === opener}
              className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                entry.id === opener
                  ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                  : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
              }`}
            >
              <span className="block text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                {entry.label}
              </span>
              <span className="block font-mono text-[9px] text-slate-500 dark:text-slate-400">
                holds {entry.holds}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {halves.map((half) => {
          const open = half.openableBy.includes(opener)
          return (
            <motion.div
              key={half.id}
              animate={{ opacity: open ? 1 : 0.9 }}
              className={`rounded-lg border-2 p-3 transition-colors ${
                open
                  ? 'border-emerald-400 bg-white dark:border-emerald-700 dark:bg-slate-950'
                  : 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                {half.title}
              </p>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                sealed with {half.sealedWith}
              </p>
              <ul className="mt-2 space-y-1">
                {half.contents.map((line) => (
                  <li
                    key={line}
                    className={`rounded px-2 py-1 font-mono text-[10px] ${
                      open
                        ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                        : 'bg-slate-200 text-transparent select-none dark:bg-slate-800'
                    }`}
                  >
                    {open ? line : '████████████████████'}
                  </li>
                ))}
              </ul>
              <p
                className={`mt-2 text-center text-[11px] font-bold ${
                  open
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {open ? 'decrypted' : 'you hold it, you cannot read it'}
              </p>
            </motion.div>
          )
        })}
      </div>

      <div
        className={`rounded-lg border p-3 text-xs leading-relaxed ${
          chosen.kind === 'user'
            ? 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200'
            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
        }`}
      >
        <span className="font-semibold">
          {chosen.account} is a {chosen.kind === 'user' ? 'user account' : chosen.kind === 'gmsa' ? 'group managed service account' : 'computer account'}.
        </span>{' '}
        {chosen.kind === 'user'
          ? 'Part two is therefore encrypted with a key derived from a password a person chose. Take it away and guess at it for as long as you like — nothing on the network will ever know.'
          : 'Part two is encrypted with a key derived from a long random password the domain generates and rotates. You can take it away; guessing it is not a plan.'}
      </div>
    </div>
  )
}
