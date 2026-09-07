import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { preAuthTypes } from '../data/events.js'

/** Lesson 2: the AS exchange, and what removing pre-authentication costs. */
export default function TgtDemo() {
  const [preauth, setPreauth] = useState(true)

  const type = preAuthTypes.find((entry) => (preauth ? entry.code === '2' : entry.code === '0'))

  const steps = preauth
    ? [
        ['client → KDC', 'AS-REQ, plus the current time encrypted with j.reyes’ key'],
        ['KDC', 'decrypts it with its copy of that key, sees a sensible timestamp'],
        ['KDC → client', 'AS-REP: a TGT sealed with the krbtgt key'],
      ]
    : [
        ['attacker → KDC', 'AS-REQ for j.reyes — no proof of anything at all'],
        ['KDC', 'account is flagged “do not require preauthentication”, so it does not ask'],
        ['KDC → attacker', 'AS-REP containing a blob encrypted with j.reyes’ key'],
      ]

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setPreauth((value) => !value)}
        aria-pressed={preauth}
        className={`self-start rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          preauth
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-rose-600 text-white hover:bg-rose-700'
        }`}
      >
        {preauth
          ? 'Pre-authentication required (normal)'
          : 'Pre-authentication not required — click to restore'}
      </button>

      <ol className="space-y-1.5">
        {steps.map(([who, what], index) => (
          <motion.li
            key={who + index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
          >
            <span className="w-20 shrink-0 font-mono text-[10px] text-slate-500 sm:w-28 dark:text-slate-400">
              {who}
            </span>
            <span className="text-[11px] leading-snug text-slate-800 dark:text-slate-200">
              {what}
            </span>
          </motion.li>
        ))}
      </ol>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <p className="font-mono text-[10px] text-slate-500">what the DC logs</p>
          <pre className="mt-1 overflow-x-auto font-mono text-[10px] leading-relaxed text-slate-300">
{`EventID              4768
TargetUserName       j.reyes
ServiceName          krbtgt
TicketEncryptionType 0x12
Status               0x0`}
            <AnimatePresence mode="wait">
              <motion.span
                key={type.code}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`block ${preauth ? 'text-emerald-300' : 'rounded bg-rose-500/25 text-rose-300'}`}
              >
                {`PreAuthType          ${type.code}${type.name === '—' ? '' : `  (${type.name})`}`}
              </motion.span>
            </AnimatePresence>
          </pre>
        </div>

        <div
          className={`rounded-lg border-2 p-3 text-xs leading-relaxed ${
            preauth
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200'
          }`}
        >
          {preauth ? (
            <>
              <span className="font-semibold">Nothing is given away.</span> The KDC only
              answers after you have already proved you know the password, so an attacker
              who does not know it gets no material to work with.
            </>
          ) : (
            <>
              <span className="font-semibold">This is AS-REP roasting.</span> Anyone who
              knows the account name can ask, and the reply contains something encrypted
              with that user’s own key — a crackable target, obtained without a single
              failed logon. {type.note}
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Microsoft’s monitoring guidance for 4768 says it plainly: a Pre-Authentication Type
        of 0 means pre-authentication was not used, and every account should be using it.
        Hunting for that single field value across your 4768 traffic finds this
        misconfiguration in one query.
      </p>
    </div>
  )
}
