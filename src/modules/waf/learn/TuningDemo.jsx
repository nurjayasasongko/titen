import { useState } from 'react'
import { motion } from 'framer-motion'
import { evaluate, remediations } from '../lib/engine.js'
import { getRequest } from '../data/requests.js'

const customer = getRequest('support-ticket')
const attacker = getRequest('schema-probe')

function Verdict({ request, result, expectBlocked }) {
  const correct = result.blocked === expectBlocked
  return (
    <div
      className={`rounded-lg border-2 p-3 transition-colors ${
        correct
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
          : 'border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
          {request.label}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
            request.intent === 'attack'
              ? 'bg-slate-800 text-white dark:bg-slate-700'
              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {request.intent}
        </span>
      </div>

      <p className="mt-1.5 font-mono text-[10px] leading-snug break-all text-slate-600 dark:text-slate-400">
        {Object.entries(request.args)
          .map(([key, value]) => `${key}=${String(value).slice(0, 52)}`)
          .join('  ')}
      </p>

      <motion.p
        key={String(result.blocked)}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`mt-2 rounded px-2 py-1.5 text-center text-[11px] font-bold ${
          result.blocked
            ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100'
            : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
        }`}
      >
        {result.blocked ? 'BLOCKED' : result.engineOff ? 'allowed (logged only)' : 'allowed'}
      </motion.p>

      <p
        className={`mt-1.5 text-[10px] leading-snug font-medium ${
          correct
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-rose-700 dark:text-rose-400'
        }`}
      >
        {correct
          ? request.intent === 'attack'
            ? 'Correct — the attack is still stopped.'
            : 'Correct — the customer gets through.'
          : request.intent === 'attack'
            ? 'You just lost this detection.'
            : 'Your customer is still blocked.'}
      </p>
    </div>
  )
}

/** Lesson 6: four ways to make the complaint stop, one of them right. */
export default function TuningDemo() {
  const [choice, setChoice] = useState('none')
  const remediation = remediations.find((item) => item.id === choice)
  const options = { paranoiaLevel: 1, ...remediation.apply() }

  const customerResult = evaluate(customer, options)
  const attackerResult = evaluate(attacker, options)
  const solved = !customerResult.blocked && attackerResult.blocked

  return (
    <div className="flex flex-col gap-4">
      {/* the audit log entry that started it */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <p className="font-mono text-[10px] text-slate-500">
          audit log — why the customer was blocked
        </p>
        <pre className="mt-1 overflow-x-auto font-mono text-[10px] leading-relaxed text-slate-300">
{`ModSecurity: Access denied with code 403 (phase 2).
  id "942190"
  msg "Detects SQL code execution and information gathering attempts"
  severity "CRITICAL"  →  anomaly score +5
  matched at ARGS:comment
  data "SELECT * FROM orders WHERE id = 1"
  uri "/api/tickets"`}
        </pre>
        <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
          The rule is not malfunctioning. That field really does contain SQL — because a
          developer pasted their slow query into your support form.
        </p>
      </div>

      {/* the fix */}
      <div>
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          What do you do?
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {remediations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setChoice(item.id)}
              aria-pressed={item.id === choice}
              className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                item.id === choice
                  ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                  : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
              }`}
            >
              <span className="block text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                {item.label}
              </span>
              <span className="mt-0.5 block font-mono text-[9px] break-all text-slate-500 dark:text-slate-400">
                {item.directive}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* both requests, judged at once */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Verdict request={customer} result={customerResult} expectBlocked={false} />
        <Verdict request={attacker} result={attackerResult} expectBlocked />
      </div>

      <motion.div
        key={choice}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg border p-3 text-[11px] leading-relaxed ${
          solved
            ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200'
            : 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200'
        }`}
      >
        <span className="font-semibold">{remediation.blurb}</span>{' '}
        {solved
          ? 'Both requests now get the outcome they deserve, and rule 942190 still protects every other parameter on every other endpoint.'
          : 'Look at both cards before you call this fixed — the complaint stopping is not the same as the problem being solved.'}
      </motion.div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Both requests are caught by the same rule, for the same reason: each contains
        SELECT … FROM. Nothing in the text distinguishes an attacker enumerating your schema
        from a developer asking for help. The only thing that separates them is{' '}
        <span className="font-mono">which parameter</span> it arrived in — which is exactly
        what the targeted exclusion encodes, and exactly what the blunt fixes throw away.
      </p>
    </div>
  )
}
