import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  effectiveLimitKb,
  inspectionLimits,
  oversizeHandling,
  verdictFor,
} from '../lib/limits.js'

const CHART_KB = 72

/** Level 2: the ceiling on what any rule set can possibly detect. */
export default function BodyLimitDemo() {
  const [offset, setOffset] = useState(4)
  const [handling, setHandling] = useState('CONTINUE')
  const [raised, setRaised] = useState(false)

  const pct = (kb) => `${Math.min(100, (kb / CHART_KB) * 100)}%`
  const missed = inspectionLimits.filter(
    (limit) => verdictFor(limit, offset, handling, raised).outcome === 'missed',
  ).length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        An attacker pads a POST body with harmless filler and puts the payload after it.
        Every rule in Level 1 is still loaded and still correct — but a rule cannot match
        bytes the engine never buffered. Drag the payload down the request and watch the
        detections switch off one by one.
      </p>

      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <ul className="space-y-2.5">
          {inspectionLimits.map((limit) => {
            const limitKb = effectiveLimitKb(limit, raised)
            const verdict = verdictFor(limit, offset, handling, raised)
            const offChart = limitKb > CHART_KB
            return (
              <li key={limit.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                    {limit.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    {offChart ? `${limitKb} KB (off this chart)` : `${limitKb} KB`}
                  </span>
                </div>
                <div className="relative mt-1 h-7 overflow-hidden rounded bg-slate-100 dark:bg-slate-900">
                  {/* what this implementation buffers */}
                  <div
                    className="absolute inset-y-0 left-0 bg-sky-200/70 dark:bg-sky-900/50"
                    style={{ width: offChart ? '100%' : pct(limitKb) }}
                  />
                  {!offChart ? (
                    <div
                      className="absolute inset-y-0 w-0.5 bg-sky-500"
                      style={{ left: pct(limitKb) }}
                    />
                  ) : null}
                  {/* the payload */}
                  <motion.div
                    animate={{ left: pct(offset) }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-sm ${
                      verdict.inspected ? 'bg-rose-500' : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                  />
                </div>
                <p
                  className={`mt-0.5 text-[10px] font-bold ${
                    verdict.outcome === 'detected'
                      ? 'text-rose-700 dark:text-rose-400'
                      : verdict.outcome === 'flagged-blindly'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-500'
                  }`}
                >
                  {verdict.outcome === 'detected'
                    ? 'payload inspected → blocked'
                    : verdict.outcome === 'flagged-blindly'
                      ? 'not inspected → flagged anyway'
                      : 'not inspected → allowed through'}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                  {limit.note}
                </p>
              </li>
            )
          })}
        </ul>

        <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-400 dark:text-slate-600">
          <span>0 KB</span>
          <span className="text-sky-600 dark:text-sky-400">payload at {offset} KB</span>
          <span>{CHART_KB} KB</span>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-2 dark:text-slate-300">
        <span className="shrink-0 sm:w-36">
          Payload buried at <span className="font-mono font-semibold">{offset} KB</span>
        </span>
        <input
          type="range"
          min={0}
          max={CHART_KB}
          value={offset}
          onChange={(event) => setOffset(Number(event.target.value))}
          className="w-full accent-sky-600"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            AWS oversize handling
          </p>
          <div className="flex gap-1">
            {oversizeHandling.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setHandling(item.id)}
                aria-pressed={item.id === handling}
                className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[10px] font-medium transition-colors ${
                  item.id === handling
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
            {oversizeHandling.find((item) => item.id === handling).blurb}
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            CloudFront body limit
          </p>
          <button
            type="button"
            onClick={() => setRaised((value) => !value)}
            aria-pressed={raised}
            className={`w-full rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
              raised
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            {raised ? 'Raised to 64 KB' : 'Default 16 KB — click to raise'}
          </button>
          <p className="mt-1.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
            Raising it costs nothing to configure and buys real inspection depth — but it
            is off by default, so almost nobody has done it.
          </p>
        </div>
      </div>

      <div
        className={`rounded-lg border p-3 text-[11px] leading-relaxed ${
          missed > 0
            ? 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
            : 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200'
        }`}
      >
        {missed > 0 ? (
          <>
            <span className="font-semibold">
              {missed} of {inspectionLimits.length} configurations never see this payload.
            </span>{' '}
            Nothing is broken and nothing is logged as an error — the rules simply were not
            shown the bytes. This is why the body inspection limit is a security setting and
            not a performance one.
          </>
        ) : (
          <>
            <span className="font-semibold">Every configuration inspects this payload.</span>{' '}
            Push it further down the body and watch that stop being true.
          </>
        )}
      </div>
    </div>
  )
}
