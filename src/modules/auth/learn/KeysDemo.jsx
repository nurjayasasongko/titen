import { useState } from 'react'
import { motion } from 'framer-motion'

const parties = [
  { id: 'you', label: 'You', sub: 'j.reyes at a workstation', holds: ['j.reyes'] },
  {
    id: 'kdc',
    label: 'Domain controller',
    sub: 'the KDC',
    holds: ['j.reyes', 'krbtgt', 'svc_sql', 'everyone else'],
  },
  { id: 'svc', label: 'MSSQLSvc/db01', sub: 'runs as svc_sql', holds: ['svc_sql'] },
]

const items = [
  {
    id: 'preauth',
    label: 'Your pre-authentication timestamp',
    sealedWith: 'j.reyes',
    why: 'You encrypt the current time with your own key. Only something that already knows your key can check it — which is how the KDC knows it is really you without ever seeing the password.',
  },
  {
    id: 'tgt',
    label: 'Your TGT',
    sealedWith: 'krbtgt',
    why: 'It says who you are and which groups you are in. You carry it everywhere and you cannot read a byte of it — if you could, you could promote yourself.',
  },
  {
    id: 'session',
    label: 'Your copy of the session key',
    sealedWith: 'j.reyes',
    why: 'Sent alongside the TGT, sealed with your key so only you get it. This is what lets you talk to the KDC afterwards without your password.',
  },
  {
    id: 'ticket',
    label: 'The service ticket for db01',
    sealedWith: 'svc_sql',
    why: 'The KDC hands you something encrypted with the service account’s key, on request. You cannot open it — but you are now holding it, and so is anyone who asks.',
  },
]

/** Lesson 1: who can open what, and the uncomfortable answer for the KDC. */
export default function KeysDemo() {
  const [itemId, setItemId] = useState('ticket')
  const item = items.find((entry) => entry.id === itemId)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Pick something that crosses the network
        </p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setItemId(entry.id)}
              aria-pressed={entry.id === itemId}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                entry.id === itemId
                  ? 'border-sky-500 bg-sky-50 text-slate-900 dark:border-sky-500 dark:bg-sky-950 dark:text-slate-100'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <p className="font-mono text-[10px] text-slate-500">on the wire</p>
        <p className="mt-1 font-mono text-xs text-slate-300">
          {item.label}{' '}
          <span className="text-amber-300">
            {'{ '}encrypted with the {item.sealedWith} key{' }'}
          </span>
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Who can open it?
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {parties.map((party) => {
            const canOpen = party.holds.includes(item.sealedWith)
            return (
              <motion.div
                key={party.id}
                animate={{ scale: canOpen ? 1 : 0.985 }}
                className={`rounded-lg border-2 p-3 transition-colors ${
                  canOpen
                    ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                  {party.label}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{party.sub}</p>
                <p className="mt-1.5 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                  holds: {party.holds.join(', ')}
                </p>
                <p
                  className={`mt-2 rounded px-2 py-1 text-center text-[11px] font-bold ${
                    canOpen
                      ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {canOpen ? 'can decrypt' : 'cannot decrypt'}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {item.why}
      </p>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Click through all four and watch the middle column. The domain controller can open
        every single one, because it holds a key for every account in the domain. It is not
        a referee between you and the service — it is the vault both of you borrow from,
        which is also why compromising it ends the conversation entirely.
      </p>
    </div>
  )
}
