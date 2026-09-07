import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { runPipeline, transformations } from '../lib/transforms.js'
import { testRule } from '../lib/engine.js'
import { rules } from '../data/rules.js'

const payloads = [
  {
    id: 'plain',
    label: 'No disguise',
    value: "' OR 1=1 --",
    note: 'What the attacker means. Any rule catches this.',
  },
  {
    id: 'encoded',
    label: 'Percent-encoded',
    value: '%27%20OR%201%3D1%20%2D%2D',
    note: 'Identical to the browser and to the database. Different bytes entirely.',
  },
  {
    id: 'case',
    label: 'Case shuffled',
    value: "' oR 1=1 --",
    note: 'SQL does not care about case. A case-sensitive pattern does.',
  },
  {
    id: 'comments',
    label: 'Comments injected',
    value: "'/**/OR/**/1=1--",
    note: 'The database ignores /* */ entirely and reads it as whitespace.',
  },
  {
    id: 'combined',
    label: 'All at once',
    value: '%27%2F%2A%2A%2FoR%2F%2A%2A%2F1%3D1%2D%2D',
    note: 'How it actually arrives when someone is trying.',
  },
]

const watched = ['942100', '942130']

/** Lesson 3: transformations, and what happens without them. */
export default function EvasionDemo() {
  const [payloadId, setPayloadId] = useState('combined')
  const [enabled, setEnabled] = useState(['urlDecodeUni', 'replaceComments', 'lowercase'])

  const payload = payloads.find((item) => item.id === payloadId)
  const { steps } = runPipeline(payload.value, enabled)
  const results = watched.map((id) => {
    const rule = rules.find((item) => item.id === id)
    return { rule, ...testRule(rule, payload.value, enabled) }
  })
  const caught = results.some((result) => result.matched)

  function toggle(id) {
    setEnabled((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          How the attacker spells it
        </p>
        <div className="flex flex-wrap gap-1.5">
          {payloads.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPayloadId(item.id)}
              aria-pressed={item.id === payloadId}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                item.id === payloadId
                  ? 'border-sky-500 bg-sky-50 text-slate-900 dark:border-sky-500 dark:bg-sky-950 dark:text-slate-100'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">{payload.note}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Normalisation pipeline
          </p>
          <ul className="space-y-1.5">
            {transformations.map((transformation) => {
              const on = enabled.includes(transformation.id)
              return (
                <li key={transformation.id}>
                  <button
                    type="button"
                    onClick={() => toggle(transformation.id)}
                    aria-pressed={on}
                    className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                      on
                        ? 'border-sky-400 bg-white dark:border-sky-700 dark:bg-slate-950'
                        : 'border-dashed border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex size-3.5 shrink-0 items-center justify-center rounded-sm border text-[9px] ${
                          on
                            ? 'border-sky-500 bg-sky-500 text-white'
                            : 'border-slate-400 dark:border-slate-600'
                        }`}
                      >
                        {on ? '✓' : ''}
                      </span>
                      <span
                        className={`font-mono text-[11px] ${
                          on
                            ? 'font-medium text-slate-900 dark:text-slate-100'
                            : 'text-slate-500 dark:text-slate-500'
                        }`}
                      >
                        {transformation.label}
                      </span>
                    </span>
                    <span className="mt-0.5 block pl-5.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                      {transformation.blurb}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            What the rule ends up looking at
          </p>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="font-mono text-[10px] text-slate-500">as received</p>
            <p className="mt-0.5 font-mono text-[11px] break-all text-amber-300">
              {payload.value}
            </p>

            <AnimatePresence initial={false}>
              {steps.map((step) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 font-mono text-[10px] text-slate-500">
                    ↓ {step.label}{' '}
                    {step.changed ? (
                      <span className="text-sky-400">changed it</span>
                    ) : (
                      <span className="text-slate-600">no effect here</span>
                    )}
                  </p>
                  <p
                    className={`mt-0.5 font-mono text-[11px] break-all ${
                      step.changed ? 'text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    {step.after}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>

            {steps.length === 0 ? (
              <p className="mt-2 font-mono text-[10px] text-slate-600">
                no transformations enabled — the rule matches these bytes as they are
              </p>
            ) : null}
          </div>

          <div className="mt-3 space-y-1.5">
            {results.map(({ rule, matched }) => (
              <div
                key={rule.id}
                className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                  matched
                    ? 'border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/50'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
                }`}
              >
                <span
                  className={`font-mono text-[10px] font-bold ${
                    matched
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {rule.id}
                </span>
                <span className="min-w-0 flex-1 text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                  {rule.msg}
                </span>
                <span
                  className={`shrink-0 text-[10px] font-semibold ${
                    matched
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {matched ? 'MATCH' : 'no match'}
                </span>
              </div>
            ))}
          </div>

          <p
            className={`mt-2 rounded-lg px-2.5 py-2 text-[11px] leading-relaxed ${
              caught
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200'
            }`}
          >
            {caught
              ? 'Caught. The pattern never saw the disguise — the pipeline had already removed it.'
              : 'This payload walks straight past. The pattern is fine; it is being shown the wrong string.'}
          </p>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Pick “All at once”, then switch every transformation off and add them back one at a
        time. Two things are worth noticing: nothing works until{' '}
        <span className="font-mono">t:urlDecodeUni</span> runs first, and{' '}
        <span className="font-mono">t:removeCommentsChar</span> is not a substitute for{' '}
        <span className="font-mono">t:replaceComments</span> — removing the characters glues{' '}
        <span className="font-mono">OR</span> onto the next word, while replacing them leaves
        the gap the pattern needs.
      </p>
    </div>
  )
}
