import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DURATION, scenarios } from '../data/learn/correlation.js'
import { evaluate, firstTrigger } from '../lib/correlation.js'
import PlaybackDock from '../../../components/PlaybackDock.jsx'

const TICK_MS = 60
const TICK_SECONDS = 3

function clockOf(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export default function CorrelateDemo() {
  const [scenarioId, setScenarioId] = useState('attack')
  const [windowSeconds, setWindowSeconds] = useState(120)
  const [threshold, setThreshold] = useState(8)
  const [now, setNow] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const controlsRef = useRef(null)

  const scenario = scenarios.find((item) => item.id === scenarioId)
  const users = useMemo(
    () => [...new Set(scenario.events.map((event) => event.user))],
    [scenario],
  )

  const finished = now >= DURATION
  const running = isPlaying && !finished

  useEffect(() => {
    if (!running) return
    const timer = setTimeout(
      () => setNow((value) => Math.min(value + TICK_SECONDS, DURATION)),
      TICK_MS,
    )
    return () => clearTimeout(timer)
  }, [running, now])

  function choose(id) {
    setScenarioId(id)
    setNow(0)
    setIsPlaying(false)
  }

  const result = evaluate(scenario.events, now, windowSeconds, threshold)
  const triggerAt = firstTrigger(scenario.events, windowSeconds, threshold)
  const hasFired = triggerAt !== null && now >= triggerAt

  const pct = (t) => `${(t / DURATION) * 100}%`
  const windowStart = Math.max(0, now - windowSeconds)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {scenarios.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => choose(item.id)}
            aria-pressed={item.id === scenarioId}
            className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors sm:flex-none ${
              item.id === scenarioId
                ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
            }`}
          >
            <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
              {item.label}
            </span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400">
              {item.events.length} failed logins, same event type
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        {scenario.description}
      </p>

      {/* the timeline: one lane per account */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="relative">
          {/* sliding window */}
          <div
            className="pointer-events-none absolute top-0 bottom-6 rounded border-x-2 border-sky-400 bg-sky-400/10 transition-none dark:border-sky-500 dark:bg-sky-500/10"
            style={{ left: pct(windowStart), width: pct(now - windowStart) }}
          />
          {/* now marker */}
          <div
            className="pointer-events-none absolute top-0 bottom-6 w-px bg-sky-500"
            style={{ left: pct(now) }}
          />

          <ul className="relative space-y-1">
            {users.map((user) => {
              const count = result.counts.find((entry) => entry.user === user)?.count ?? 0
              const isBreaching = count >= threshold
              return (
                <li key={user} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 truncate font-mono text-[10px] text-slate-500 sm:w-20 dark:text-slate-400">
                    {user}
                  </span>
                  <span className="relative h-7 flex-1 rounded bg-slate-100 dark:bg-slate-900">
                    {scenario.events
                      .filter((event) => event.user === user)
                      .map((event) => {
                        const arrived = event.t <= now
                        const inWindow = arrived && event.t > now - windowSeconds
                        return (
                          <motion.span
                            key={event.t}
                            initial={false}
                            animate={{
                              scale: arrived ? 1 : 0,
                              opacity: arrived ? (inWindow ? 1 : 0.28) : 0,
                            }}
                            transition={{ duration: 0.18 }}
                            style={{ left: pct(event.t) }}
                            className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                              isBreaching && inWindow ? 'bg-rose-500' : 'bg-slate-500 dark:bg-slate-400'
                            }`}
                          />
                        )
                      })}
                  </span>
                  <span
                    className={`w-11 shrink-0 text-right font-mono text-[10px] tabular-nums sm:w-14 sm:text-[11px] ${
                      isBreaching
                        ? 'font-bold text-rose-600 dark:text-rose-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {count} / {threshold}
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400 dark:text-slate-600">
            <span>00:00</span>
            <span className="text-sky-600 dark:text-sky-400">now {clockOf(now)}</span>
            <span>{clockOf(DURATION)}</span>
          </div>
        </div>
      </div>

      {/* verdict */}
      <div
        className={`rounded-lg border p-3 text-xs leading-relaxed transition-colors ${
          hasFired
            ? 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
            : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={hasFired ? 'fired' : 'quiet'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {hasFired ? (
              <>
                <span className="font-semibold">Rule fired at {clockOf(triggerAt)}.</span>{' '}
                {result.top.user} reached {result.top.count} failures inside a{' '}
                {windowSeconds}s window. One alert — built out of {result.arrived} events
                that individually meant nothing.
              </>
            ) : (
              <>
                <span className="font-semibold">Quiet.</span> {result.arrived} events have
                arrived; the busiest account has {result.top.count} inside the window,
                below the threshold of {threshold}. Alerting per event instead would have
                interrupted an analyst {result.arrived} times by now.
              </>
            )}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* controls */}
      <div ref={controlsRef} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (finished) setNow(0)
              setIsPlaying((value) => !value)
            }}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
          >
            {running ? 'Pause' : finished ? 'Replay' : 'Run the clock'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false)
              setNow(0)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reset
          </button>
          <label className="flex flex-1 flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-2 dark:text-slate-300">
            <span className="shrink-0">Scrub time</span>
            <input
              type="range"
              min={0}
              max={DURATION}
              value={now}
              onChange={(event) => {
                setIsPlaying(false)
                setNow(Number(event.target.value))
              }}
              className="w-full accent-sky-600"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-2 dark:text-slate-300">
            <span className="shrink-0 sm:w-28">
              Window: <span className="font-mono font-semibold">{windowSeconds}s</span>
            </span>
            <input
              type="range"
              min={30}
              max={300}
              step={10}
              value={windowSeconds}
              onChange={(event) => setWindowSeconds(Number(event.target.value))}
              className="w-full accent-sky-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-2 dark:text-slate-300">
            <span className="shrink-0 sm:w-28">
              Threshold: <span className="font-mono font-semibold">{threshold}</span>
            </span>
            <input
              type="range"
              min={2}
              max={14}
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="w-full accent-sky-600"
            />
          </label>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Try it: drop the threshold to 2 and switch to “A normal Tuesday” — the rule now
          screams at people mistyping passwords. Then set it to 14 on the attack, or shrink
          the window to 30s, and the same attack slips through untouched. That trade-off
          never goes away; tuning is choosing where to sit on it.
        </p>
      </div>

      <PlaybackDock
        anchorRef={controlsRef}
        isPlaying={running}
        onTogglePlay={() => {
          if (finished) setNow(0)
          setIsPlaying((value) => !value)
        }}
        label={scenario.label}
        progress={`clock ${clockOf(now)} · ${result.arrived} events`}
      />
    </div>
  )
}
