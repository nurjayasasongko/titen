import { useState } from 'react'
import { motion } from 'framer-motion'
import { levels, rankedQueue, urgencyOf } from '../lib/urgency.js'

const tone = [
  'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'bg-sky-200 text-sky-900 dark:bg-sky-900 dark:text-sky-200',
  'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200',
  'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200',
]

export default function AlertDemo() {
  const [severity, setSeverity] = useState(2)
  const [priority, setPriority] = useState(1)

  const mine = {
    id: 'MINE',
    title: 'Multiple failed logins — j.reyes',
    severity,
    priority,
  }
  const urgency = urgencyOf(severity, priority)
  const ranked = rankedQueue(mine)
  const position = ranked.findIndex((alert) => alert.id === 'MINE') + 1

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* the two dials */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
              How bad is the pattern? (set by the rule)
            </p>
            <div className="mt-1.5 flex gap-1">
              {levels.map((level, index) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(index)}
                  aria-pressed={index === severity}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                    index === severity
                      ? tone[index]
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
              How much does the target matter? (set by the asset inventory)
            </p>
            <div className="mt-1.5 flex gap-1">
              {levels.map((level, index) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriority(index)}
                  aria-pressed={index === priority}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                    index === priority
                      ? tone[index]
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              low = a test VM · critical = the domain controller
            </p>
          </div>

          <div className="rounded-lg border-2 border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[10px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
              The alert an analyst receives
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
              {mine.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`rounded px-1.5 py-0.5 font-medium capitalize ${tone[severity]}`}>
                severity: {levels[severity]}
              </span>
              <span className="text-slate-400">+</span>
              <span className={`rounded px-1.5 py-0.5 font-medium capitalize ${tone[priority]}`}>
                asset: {levels[priority]}
              </span>
              <span className="text-slate-400">=</span>
              <motion.span
                key={urgency}
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                className={`rounded px-2 py-0.5 font-bold capitalize ${tone[urgency]}`}
              >
                urgency: {levels[urgency]}
              </motion.span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Status: New · Owner: unassigned · Evidence: 11 events attached
            </p>
          </div>
        </div>

        {/* the queue it lands in */}
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            This morning’s queue — position {position} of {ranked.length}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {ranked.map((alert) => {
              const isMine = alert.id === 'MINE'
              return (
                <motion.li
                  key={alert.id}
                  layout
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  className={`flex items-center gap-2 rounded-lg border p-2 ${
                    isMine
                      ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
                  }`}
                >
                  <span
                    className={`w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold capitalize ${tone[alert.urgency]}`}
                  >
                    {levels[alert.urgency]}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-xs ${
                      isMine
                        ? 'font-semibold text-slate-900 dark:text-slate-50'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {alert.title}
                  </span>
                  {isMine ? (
                    <span className="shrink-0 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                      yours
                    </span>
                  ) : null}
                </motion.li>
              )
            })}
          </ul>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Leave the rule severity alone and change only the asset. The pattern detected is
        identical every time — but the same eleven failed logins move from the bottom of
        the queue to the top purely because of what they were aimed at. That is why asset
        inventory work, which looks like boring admin, decides whether your detections are
        usable.
      </p>
    </div>
  )
}
