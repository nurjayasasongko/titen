import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { evaluate } from '../lib/engine.js'
import PlaybackDock from '../../../components/PlaybackDock.jsx'
import { defaultThresholds, rulesAtParanoia, severityScore } from '../data/rules.js'
import { requests } from '../data/requests.js'

const severityTone = {
  CRITICAL: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300',
  ERROR: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300',
  WARNING: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
  NOTICE: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

/** Lesson 4: rules add points; one rule at the end does the blocking. */
export default function ScoringDemo() {
  const [requestId, setRequestId] = useState('obvious-attack')
  const [threshold, setThreshold] = useState(defaultThresholds.inbound)
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const controlsRef = useRef(null)

  const request = requests.find((item) => item.id === requestId)
  const active = rulesAtParanoia(2)
  const result = evaluate(request, { paranoiaLevel: 2, threshold })
  const revealed = result.matches.slice(0, step)
  const score = revealed.reduce((total, match) => total + match.points, 0)
  const finished = step >= result.matches.length

  // "playing" only means anything while there are matches left to reveal,
  // so the run stops on its own without an effect writing state back.
  const runningNow = running && !finished

  useEffect(() => {
    if (!runningNow) return
    const timer = setTimeout(() => setStep((value) => value + 1), 700)
    return () => clearTimeout(timer)
  }, [runningNow, step])

  function choose(id) {
    setRequestId(id)
    setStep(0)
    setRunning(false)
  }

  const barPct = Math.min(100, (score / Math.max(threshold, 1)) * 100)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {requests.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => choose(item.id)}
            aria-pressed={item.id === requestId}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
              item.id === requestId
                ? 'border-sky-500 bg-sky-50 text-slate-900 dark:border-sky-500 dark:bg-sky-950 dark:text-slate-100'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
            }`}
          >
            {item.label}
            <span
              className={`ml-1.5 text-[9px] ${
                item.intent === 'attack'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {item.intent}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        {/* the running total */}
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            tx.inbound_anomaly_score
          </p>
          <p className="font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-slate-50">
            {score}
            <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
              / {threshold}
            </span>
          </p>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <motion.div
            animate={{ width: `${barPct}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            className={`h-full ${score >= threshold ? 'bg-rose-500' : 'bg-sky-500'}`}
          />
        </div>

        {/* the rules, in order */}
        <ul className="mt-3 space-y-1">
          {active.map((rule) => {
            const match = revealed.find((item) => item.rule.id === rule.id)
            const willMatch = result.matches.some((item) => item.rule.id === rule.id)
            const pending = !match && willMatch && step < result.matches.length
            return (
              <li
                key={rule.id}
                className={`flex items-center gap-2 rounded border px-2 py-1.5 transition-colors ${
                  match
                    ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <span
                  className={`font-mono text-[10px] font-bold ${
                    match
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {rule.id}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-[10px] ${
                    match
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {rule.msg}
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                    match ? severityTone[rule.severity] : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {rule.severity}
                </span>
                <span
                  className={`w-10 shrink-0 text-right font-mono text-[10px] font-bold tabular-nums ${
                    match
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-slate-300 dark:text-slate-700'
                  }`}
                >
                  {match ? `+${match.points}` : pending ? '…' : '—'}
                </span>
              </li>
            )
          })}
        </ul>

        {/* the only rule that blocks */}
        <div
          className={`mt-2 rounded border px-2 py-2 text-[11px] ${
            finished && score >= threshold
              ? 'border-rose-400 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200'
              : finished
                ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200'
                : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
          }`}
        >
          <span className="font-mono font-bold">949110</span> Inbound Anomaly Score Exceeded —{' '}
          {finished
            ? score >= threshold
              ? `${score} ≥ ${threshold}, request blocked with 403.`
              : `${score} < ${threshold}, request allowed through.`
            : 'waiting for every rule to finish scoring…'}
        </div>
      </div>

      <div ref={controlsRef} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (finished) setStep(0)
              setRunning(true)
            }}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            {finished ? 'Run again' : 'Run the rules'}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false)
              setStep((value) => Math.min(value + 1, result.matches.length))
            }}
            disabled={finished}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            One rule at a time
          </button>
          <span className="text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
            {step} / {result.matches.length} matches applied
          </span>
        </div>

        <label className="flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-2 dark:text-slate-300">
          <span className="shrink-0 sm:w-40">
            Threshold: <span className="font-mono font-semibold">{threshold}</span>
            {threshold === defaultThresholds.inbound ? (
              <span className="ml-1 text-[10px] text-slate-400">(CRS default)</span>
            ) : null}
          </span>
          <input
            type="range"
            min={2}
            max={20}
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
            className="w-full accent-sky-600"
          />
        </label>

        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Severity is what sets the points: CRITICAL {severityScore.CRITICAL}, ERROR{' '}
          {severityScore.ERROR}, WARNING {severityScore.WARNING}, NOTICE{' '}
          {severityScore.NOTICE}. Notice that one CRITICAL rule reaches the default
          threshold of {defaultThresholds.inbound} on its own — but two WARNINGs get there
          too, which is how a request nobody would call an attack ends up blocked.
        </p>
      </div>

      <PlaybackDock
        anchorRef={controlsRef}
        isPlaying={runningNow}
        onTogglePlay={() => {
          if (finished) setStep(0)
          setRunning((value) => !value)
        }}
        label={request.label}
        progress={`score ${score} / ${threshold}`}
      />
    </div>
  )
}
