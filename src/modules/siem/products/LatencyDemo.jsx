import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { DURATION, scenarios } from '../data/learn/correlation.js'
import PlaybackDock from '../../../components/PlaybackDock.jsx'
import {
  detectionDelay,
  scheduleRuns,
  scheduledTrigger,
  streamingTrigger,
} from '../lib/detection.js'

const RULE_WINDOW = 120
const THRESHOLD = 8
const attack = scenarios.find((scenario) => scenario.id === 'attack').events

const engines = [
  {
    id: 'qradar',
    name: 'QRadar',
    engine: 'Custom Rules Engine (ecs-ep)',
    kind: 'streaming',
    note: 'Evaluates every normalised event as it passes through the Event Processor.',
  },
  {
    id: 'splunk',
    name: 'Splunk ES',
    engine: 'Correlation search',
    kind: 'scheduled',
    note: 'A saved search on a cron schedule, looking back over a time range.',
  },
  {
    id: 'wazuh',
    name: 'Wazuh',
    engine: 'Composite rule (analysisd)',
    kind: 'streaming',
    note: 'frequency + timeframe counted in memory as events are decoded.',
  },
]

function clockOf(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Level 2's version of the correlation lesson: the same attack, but now the
 * question is *when each product would have told you*.
 */
export default function LatencyDemo() {
  const [interval, setIntervalSeconds] = useState(120)
  const [lookback, setLookback] = useState(300)
  const [now, setNow] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const controlsRef = useRef(null)

  const finished = now >= DURATION
  const running = isPlaying && !finished

  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => setNow((value) => Math.min(value + 3, DURATION)), 55)
    return () => clearTimeout(timer)
  }, [running, now])

  const streamingAt = streamingTrigger(attack, RULE_WINDOW, THRESHOLD)
  const scheduledAt = scheduledTrigger(attack, {
    ruleWindow: RULE_WINDOW,
    threshold: THRESHOLD,
    interval,
    lookback,
    horizon: DURATION,
  })
  const delay = detectionDelay(streamingAt, scheduledAt)
  const runs = scheduleRuns(interval, DURATION)
  const pct = (t) => `${(t / DURATION) * 100}%`

  const detectionOf = (engine) => (engine.kind === 'streaming' ? streamingAt : scheduledAt)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        Same attack as lesson 4, same rule: 8 failures against one account inside 120
        seconds. The only thing that changes is <em>how the product watches</em>. Run the
        clock and see when each one would have told you.
      </p>

      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        {/* the events themselves */}
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[10px] text-slate-500 sm:w-24 dark:text-slate-400">
            failed logins
          </span>
          <span className="relative h-6 flex-1 rounded bg-slate-100 dark:bg-slate-900">
            {attack.map((event) => (
              <motion.span
                key={event.t}
                initial={false}
                animate={{ scale: event.t <= now ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                style={{ left: pct(event.t) }}
                className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500 dark:bg-slate-400"
              />
            ))}
          </span>
          <span className="w-12 shrink-0 sm:w-20" />
        </div>

        {/* one lane per product */}
        <ul className="mt-2 space-y-2">
          {engines.map((engine) => {
            const at = detectionOf(engine)
            const hasFired = at !== null && now >= at
            return (
              <li key={engine.id} className="flex items-center gap-2">
                <span className="w-16 shrink-0 sm:w-24">
                  <span className="block text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                    {engine.name}
                  </span>
                  <span
                    className={`text-[9px] ${
                      engine.kind === 'streaming'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {engine.kind}
                  </span>
                </span>

                <span className="relative h-8 flex-1 rounded bg-slate-100 dark:bg-slate-900">
                  {/* when a scheduled search actually looks */}
                  {engine.kind === 'scheduled'
                    ? runs.map((run) => (
                        <span
                          key={run}
                          style={{ left: pct(run) }}
                          className={`absolute top-0 bottom-0 w-px ${
                            run <= now
                              ? 'bg-amber-400 dark:bg-amber-600'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        />
                      ))
                    : null}

                  {/* the moment it fires */}
                  {at !== null ? (
                    <motion.span
                      initial={false}
                      animate={{ scale: hasFired ? 1 : 0, opacity: hasFired ? 1 : 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      style={{ left: pct(at) }}
                      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold whitespace-nowrap text-white"
                    >
                      alert {clockOf(at)}
                    </motion.span>
                  ) : (
                    <span className="absolute top-1/2 left-2 -translate-y-1/2 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                      never fires with these settings
                    </span>
                  )}

                  {/* progress of the clock */}
                  <span
                    className="absolute top-0 bottom-0 w-px bg-sky-500"
                    style={{ left: pct(now) }}
                  />
                </span>

                <span className="w-12 shrink-0 text-right font-mono text-[10px] text-slate-500 tabular-nums sm:w-20 dark:text-slate-400">
                  {hasFired ? clockOf(at) : '—'}
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

      {/* the point */}
      <div
        className={`rounded-lg border p-3 text-xs leading-relaxed ${
          scheduledAt === null
            ? 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
        }`}
      >
        {scheduledAt === null ? (
          <>
            <span className="font-semibold">The scheduled search never fires.</span> Its
            lookback ({lookback}s) is shorter than the rule window it is trying to
            evaluate ({RULE_WINDOW}s), so it can never see 8 events at once — no matter
            how often it runs. The streaming engines caught it at{' '}
            {clockOf(streamingAt)} regardless.
          </>
        ) : (
          <>
            <span className="font-semibold">
              Streaming caught it at {clockOf(streamingAt)}. The scheduled search caught it
              at {clockOf(scheduledAt)} — {delay} seconds later.
            </span>{' '}
            That gap is not a bug, it is the schedule. A correlation search that runs every{' '}
            {interval} seconds has a floor on how fast it can possibly tell you, and your
            mean time to detect can never be better than that floor.
          </>
        )}
      </div>

      <div ref={controlsRef} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (finished) setNow(0)
              setIsPlaying((value) => !value)
            }}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            {running ? 'Pause' : finished ? 'Replay' : 'Run the clock'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false)
              setNow(0)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Reset
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-2 dark:text-slate-300">
            <span className="shrink-0 sm:w-32">
              Runs every <span className="font-mono font-semibold">{interval}s</span>
            </span>
            <input
              type="range"
              min={30}
              max={300}
              step={30}
              value={interval}
              onChange={(event) => setIntervalSeconds(Number(event.target.value))}
              className="w-full accent-sky-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-2 dark:text-slate-300">
            <span className="shrink-0 sm:w-32">
              Looks back <span className="font-mono font-semibold">{lookback}s</span>
            </span>
            <input
              type="range"
              min={20}
              max={300}
              step={20}
              value={lookback}
              onChange={(event) => setLookback(Number(event.target.value))}
              className="w-full accent-sky-600"
            />
          </label>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Try setting the lookback below 120s — the rule quietly stops working, while still
          appearing perfectly healthy in the interface. This is the single most common way
          a scheduled correlation rule ends up detecting nothing at all.
        </p>
      </div>

      <PlaybackDock
        anchorRef={controlsRef}
        isPlaying={running}
        onTogglePlay={() => {
          if (finished) setNow(0)
          setIsPlaying((value) => !value)
        }}
        label="Detection latency"
        progress={`clock ${clockOf(now)}`}
      />
    </div>
  )
}
