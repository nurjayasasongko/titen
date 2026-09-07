import { useState } from 'react'
import { motion } from 'framer-motion'
import { evaluate } from '../lib/engine.js'
import { paranoiaLevels, rules } from '../data/rules.js'
import { requests } from '../data/requests.js'

/** Lesson 5: the dial, and what it costs in both directions. */
export default function ParanoiaDemo() {
  const [level, setLevel] = useState(1)
  const current = paranoiaLevels.find((item) => item.level === level)

  const verdicts = requests.map((request) => ({
    request,
    result: evaluate(request, { paranoiaLevel: level }),
  }))
  const missedAttacks = verdicts.filter(
    (entry) => entry.request.intent === 'attack' && !entry.result.blocked,
  ).length
  const falsePositives = verdicts.filter(
    (entry) => entry.request.intent === 'legitimate' && entry.result.blocked,
  ).length

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap gap-1.5">
          {paranoiaLevels.map((item) => (
            <button
              key={item.level}
              type="button"
              onClick={() => setLevel(item.level)}
              aria-pressed={item.level === level}
              className={`min-w-[5rem] flex-1 rounded-lg border px-2 py-2 text-center transition-colors ${
                item.level === level
                  ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                  : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
              }`}
            >
              <span className="block font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                {item.label}
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                {item.name}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {current.label}:
          </span>{' '}
          {current.blurb} <span className="text-slate-500">{current.risk}</span>
        </p>
      </div>

      {/* the four requests, judged at this level */}
      <div className="grid gap-2 sm:grid-cols-2">
        {verdicts.map(({ request, result }) => {
          const wrong =
            (request.intent === 'attack' && !result.blocked) ||
            (request.intent === 'legitimate' && result.blocked)
          return (
            <motion.div
              key={request.id}
              layout
              className={`rounded-lg border-2 p-2.5 transition-colors ${
                wrong
                  ? 'border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40'
                  : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
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
              <div className="mt-1.5 flex items-baseline gap-2">
                <span
                  className={`text-[11px] font-bold ${
                    result.blocked
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {result.blocked ? 'BLOCKED' : 'allowed'}
                </span>
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  score {result.score} / {result.threshold}
                </span>
              </div>
              <p className="mt-1 font-mono text-[9px] leading-snug text-slate-500 dark:text-slate-500">
                {result.matches.length
                  ? result.matches.map((match) => match.rule.id).join(' · ')
                  : 'no rule matched'}
              </p>
              {wrong ? (
                <p className="mt-1 text-[10px] font-medium text-rose-700 dark:text-rose-400">
                  {request.intent === 'attack'
                    ? 'False negative — this got through.'
                    : 'False positive — a real user was blocked.'}
                </p>
              ) : null}
            </motion.div>
          )
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] dark:bg-slate-900">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Attacks getting through:
          </span>{' '}
          <span className="font-mono font-bold">{missedAttacks}</span>
        </p>
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] dark:bg-slate-900">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Real customers blocked:
          </span>{' '}
          <span className="font-mono font-bold">{falsePositives}</span>
        </p>
      </div>

      {/* which rules the dial switched on */}
      <div>
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Rules loaded at {current.label}
        </p>
        <ul className="space-y-1">
          {rules.map((rule) => {
            const active = rule.paranoia <= level
            const justAdded = rule.paranoia === level
            return (
              <li
                key={rule.id}
                className={`flex items-center gap-2 rounded border px-2 py-1 transition-colors ${
                  justAdded
                    ? 'border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/50'
                    : active
                      ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
                      : 'border-dashed border-slate-200 bg-slate-50 opacity-50 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <span className="w-8 shrink-0 font-mono text-[9px] text-slate-500 dark:text-slate-500">
                  PL{rule.paranoia}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold ${
                    active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {rule.id}
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {rule.msg}
                </span>
                {justAdded ? (
                  <span className="shrink-0 text-[9px] font-bold text-sky-600 dark:text-sky-400">
                    added here
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Walk the dial from PL1 to PL4 and watch which column moves. The attacks are already
        blocked at PL1 and stay blocked — raising the level does not improve them at all
        here. What changes is the other column: the rules being switched on are the ones
        that judge input for being unusual, and ordinary customers write unusual-looking
        things all day.
      </p>
    </div>
  )
}
