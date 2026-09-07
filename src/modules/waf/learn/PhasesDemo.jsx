import { useState } from 'react'
import { motion } from 'framer-motion'

const phases = [
  {
    id: 1,
    name: 'Request headers',
    when: 'The request line and headers have been read off the socket.',
    available: ['requestLine', 'headers', 'cookies'],
  },
  {
    id: 2,
    name: 'Request body',
    when: 'The body has been buffered and parsed into parameters.',
    available: ['requestLine', 'headers', 'cookies', 'body'],
  },
  {
    id: 3,
    name: 'Response headers',
    when: 'Your application has replied; the headers are about to go out.',
    available: ['requestLine', 'headers', 'cookies', 'body', 'responseHeaders'],
  },
  {
    id: 4,
    name: 'Response body',
    when: 'The response body has been buffered, if you asked for it to be.',
    available: ['requestLine', 'headers', 'cookies', 'body', 'responseHeaders', 'responseBody'],
  },
  {
    id: 5,
    name: 'Logging',
    when: 'Everything is decided. This phase can only change what gets written down.',
    available: ['requestLine', 'headers', 'cookies', 'body', 'responseHeaders', 'responseBody'],
    noBlocking: true,
  },
]

const data = [
  { id: 'requestLine', label: 'REQUEST_URI', note: 'method, path, query string' },
  { id: 'headers', label: 'REQUEST_HEADERS', note: 'User-Agent, Host, Content-Type' },
  { id: 'cookies', label: 'REQUEST_COOKIES', note: 'session, preferences' },
  { id: 'body', label: 'ARGS_POST', note: 'the form or JSON body' },
  { id: 'responseHeaders', label: 'RESPONSE_HEADERS', note: 'status, content type' },
  { id: 'responseBody', label: 'RESPONSE_BODY', note: 'the HTML your app returned' },
]

const goals = [
  {
    id: 'ua',
    label: 'Block a scanner by its User-Agent',
    needs: 'headers',
    earliest: 1,
  },
  {
    id: 'sqli',
    label: 'Find SQL injection in a POST form field',
    needs: 'body',
    earliest: 2,
  },
  {
    id: 'leak',
    label: 'Catch a database error leaking in the page',
    needs: 'responseBody',
    earliest: 4,
  },
]

/** Lesson 2: what exists at each phase, and what a misplaced rule does. */
export default function PhasesDemo() {
  const [phaseId, setPhaseId] = useState(1)
  const [goalId, setGoalId] = useState('sqli')

  const phase = phases.find((item) => item.id === phaseId)
  const goal = goals.find((item) => item.id === goalId)
  const hasData = phase.available.includes(goal.needs)
  const works = hasData && !phase.noBlocking

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Put your rule in a phase
        </p>
        <ol className="flex flex-wrap gap-1.5">
          {phases.map((item) => (
            <li key={item.id} className="min-w-[7rem] flex-1">
              <button
                type="button"
                onClick={() => setPhaseId(item.id)}
                aria-pressed={item.id === phaseId}
                className={`w-full rounded-lg border p-2 text-left transition-colors ${
                  item.id === phaseId
                    ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                    : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
                }`}
              >
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-500">
                  phase:{item.id}
                </span>
                <span className="block text-[11px] leading-tight font-medium text-slate-900 dark:text-slate-100">
                  {item.name}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">{phase.when}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            What the engine can inspect right now
          </p>
          <ul className="space-y-1">
            {data.map((item) => {
              const ready = phase.available.includes(item.id)
              return (
                <li
                  key={item.id}
                  className={`flex items-center gap-2 rounded border px-2 py-1.5 transition-colors ${
                    ready
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
                      : 'border-dashed border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <span
                    className={`text-[11px] ${
                      ready
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {ready ? '✓' : '—'}
                  </span>
                  <span
                    className={`font-mono text-[11px] ${
                      ready
                        ? 'font-medium text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-500">
                    {ready ? item.note : 'not read yet'}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            What you wanted the rule to do
          </p>
          <div className="space-y-1.5">
            {goals.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGoalId(item.id)}
                aria-pressed={item.id === goalId}
                className={`w-full rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors ${
                  item.id === goalId
                    ? 'border-sky-500 bg-sky-50 font-medium dark:border-sky-500 dark:bg-sky-950'
                    : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
                }`}
              >
                <span className="block text-slate-900 dark:text-slate-100">{item.label}</span>
                <span className="block font-mono text-[10px] text-slate-500 dark:text-slate-500">
                  needs {item.needs}
                </span>
              </button>
            ))}
          </div>

          <motion.div
            key={`${phaseId}-${goalId}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 rounded-lg border p-3 text-[11px] leading-relaxed ${
              works
                ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200'
                : 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
            }`}
          >
            {works ? (
              <>
                <span className="font-bold">This works.</span> At phase {phaseId} the
                engine already has {goal.needs}, and this phase can still block.
              </>
            ) : phase.noBlocking ? (
              <>
                <span className="font-bold">The data is there, but it is too late.</span>{' '}
                Phase 5 runs after the response has gone. Rules here can only change what
                is logged — they cannot block anything.
              </>
            ) : (
              <>
                <span className="font-bold">This rule can never match.</span> At phase{' '}
                {phaseId} the engine has not read {goal.needs} yet, so the variable is
                empty. No error is raised, nothing appears in the log, and the rule looks
                perfectly healthy in your config. Move it to phase {goal.earliest}.
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
