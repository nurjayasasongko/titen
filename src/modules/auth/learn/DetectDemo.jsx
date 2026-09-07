import { useState } from 'react'
import { motion } from 'framer-motion'
import { spns } from '../data/events.js'

/** A honeypot SPN nobody should ever touch. */
const honeypot = {
  spn: 'MSSQLSvc/backup-sql-07.corp.example.com:1433',
  account: 'svc_backup_old',
  note: 'created as a trap · no permissions · used by nothing',
}

const detections = [
  {
    id: 'volume',
    label: 'Alert on volume',
    detail: 'one account requesting many distinct SPNs in a short window',
    catches: (roast) => roast.length >= 6,
    falsePositive: 'A vulnerability scanner or a login script can trip this. Needs a threshold you will spend weeks tuning.',
  },
  {
    id: 'etype',
    label: 'Alert on RC4 (4769 etype 0x17)',
    detail: 'Microsoft says to monitor for any type other than 0x11 / 0x12',
    catches: (roast) => roast.some((entry) => entry.rc4),
    falsePositive: 'A handful of genuinely old systems still request RC4. You must baseline them first, or drown.',
  },
  {
    id: 'honeypot',
    label: 'Alert on the honeypot SPN',
    detail: 'a single 4769 naming an account nothing legitimately uses',
    catches: (roast) => roast.some((entry) => entry.spn === honeypot.spn),
    falsePositive: 'None by construction. No real process ever asks for this ticket, so one request is one alert — no threshold at all.',
  },
]

export default function DetectDemo() {
  const [roast, setRoast] = useState([])
  const all = [...spns, { ...honeypot, kind: 'user', set: 'RC4 only' }]

  function runRoast() {
    // the attacker sweeps every SPN, honeypot included, all as RC4
    setRoast(all.map((entry) => ({ spn: entry.spn, account: entry.account, rc4: true })))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runRoast}
          className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Run the roast
        </button>
        <button
          type="button"
          onClick={() => setRoast([])}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Reset
        </button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          The attacker asks for a ticket for every SPN — including one they have no way of
          knowing is a trap.
        </span>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <p className="font-mono text-[10px] text-slate-500">4769 events on the DC</p>
        <div className="mt-1 space-y-0.5">
          {roast.length === 0 ? (
            <p className="font-mono text-[10px] text-slate-600">quiet…</p>
          ) : (
            roast.map((entry, index) => (
              <motion.p
                key={entry.spn}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`font-mono text-[10px] ${
                  entry.spn === honeypot.spn ? 'rounded bg-rose-500/25 text-rose-300' : 'text-slate-300'
                }`}
              >
                4769 svc={entry.account} etype=0x17 status=0x0
                {entry.spn === honeypot.spn ? '   ← honeypot' : ''}
              </motion.p>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {detections.map((detection) => {
          const fired = roast.length > 0 && detection.catches(roast)
          return (
            <div
              key={detection.id}
              className={`rounded-lg border-2 p-3 transition-colors ${
                fired
                  ? detection.id === 'honeypot'
                    ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/50'
                    : 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                  {detection.label}
                </p>
                {fired ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      detection.id === 'honeypot'
                        ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
                        : 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                    }`}
                  >
                    FIRED
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                {detection.detail}
              </p>
              <p
                className={`mt-2 text-[10px] leading-snug ${
                  detection.id === 'honeypot'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-500'
                }`}
              >
                {detection.falsePositive}
              </p>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        All three fire on a full roast — but look at the third column of each. The volume
        and RC4 rules also fire on legitimate activity, so they arrive pre-loaded with false
        positives you have to tune away. The honeypot has none: nothing legitimate ever
        requests that ticket, so the alert needs no threshold and no baseline. It is the
        cheapest high-fidelity detection in the whole of Active Directory.
      </p>
    </div>
  )
}
