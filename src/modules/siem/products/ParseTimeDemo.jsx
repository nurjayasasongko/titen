import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const FIX_DAY = 2 // Wednesday

const approaches = [
  {
    id: 'qradar',
    name: 'QRadar',
    when: 'ingest',
    where: 'DSM in ecs-ec, before storage',
    stored: 'normalised fields',
  },
  {
    id: 'splunk',
    name: 'Splunk',
    when: 'search',
    where: 'props.conf, every time you search',
    stored: 'the raw text',
  },
  {
    id: 'wazuh',
    name: 'Wazuh',
    when: 'ingest',
    where: 'decoders in analysisd, before the alert is written',
    stored: 'decoded fields',
  },
]

/**
 * Why "when does parsing happen" is not a trivia question: it decides
 * whether fixing a broken parser repairs last week's data or only
 * tomorrow's.
 */
export default function ParseTimeDemo() {
  const [fixed, setFixed] = useState(false)

  const isReadable = (approach, dayIndex) =>
    approach.when === 'search' ? fixed : fixed && dayIndex >= FIX_DAY

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        A new log source was onboarded on Monday with a parser that does not work — the
        events arrive and are stored, but the fields come out empty. You notice on
        Wednesday and deploy a fix. The question every analyst eventually has to ask:{' '}
        <span className="font-medium text-slate-800 dark:text-slate-100">
          can I now search Monday’s data properly?
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setFixed((value) => !value)}
          aria-pressed={fixed}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            fixed
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-sky-600 text-white hover:bg-sky-700'
          }`}
        >
          {fixed ? 'Parser fix is deployed (Wed)' : 'Deploy the parser fix on Wednesday'}
        </button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Watch what happens to <span className="font-medium">Monday and Tuesday</span>.
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {approaches.map((approach) => {
          const readable = days.filter((_, index) => isReadable(approach, index)).length
          return (
            <div
              key={approach.id}
              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {approach.name}
                </p>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                    approach.when === 'ingest'
                      ? 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-300'
                      : 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300'
                  }`}
                >
                  parses at {approach.when}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {approach.where}
              </p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                Stores: <span className="font-mono">{approach.stored}</span>
              </p>

              <ul className="mt-2.5 space-y-1">
                {days.map((day, index) => {
                  const ok = isReadable(approach, index)
                  return (
                    <li
                      key={day}
                      className={`flex items-center gap-2 rounded border px-2 py-1.5 transition-colors duration-300 ${
                        ok
                          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <span className="w-8 shrink-0 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                        {day}
                      </span>
                      <AnimatePresence mode="wait" initial={false}>
                        {ok ? (
                          <motion.span
                            key="ok"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="truncate font-mono text-[10px] text-emerald-800 dark:text-emerald-300"
                          >
                            user=j.reyes src_ip=203.0.113.47
                          </motion.span>
                        ) : (
                          <motion.span
                            key="bad"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="truncate font-mono text-[10px] text-slate-400 dark:text-slate-600"
                          >
                            user=— src_ip=—
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </li>
                  )
                })}
              </ul>

              <p
                className={`mt-2 rounded px-2 py-1 text-center text-[11px] font-semibold ${
                  readable === days.length
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                    : readable === 0
                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {readable} of {days.length} days searchable
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-cyan-300 bg-cyan-50 p-3 dark:border-cyan-800 dark:bg-cyan-950/40">
          <p className="text-[10px] font-semibold tracking-wide text-cyan-800 uppercase dark:text-cyan-400">
            Parsing at search time
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
            The raw text was kept, so fixing the parser repairs history — Monday becomes
            searchable retroactively. The price is paid on every single search, forever:
            the extraction runs again each time anyone queries that data.
          </p>
        </div>
        <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-950/40">
          <p className="text-[10px] font-semibold tracking-wide text-violet-800 uppercase dark:text-violet-400">
            Parsing at ingest
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
            The work is done once and searches are cheap and fast forever after. The price
            is that Monday and Tuesday are permanently mis-parsed — the fix only applies to
            events that arrive after it. Getting the parser right before onboarding
            matters much more here.
          </p>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Two caveats worth knowing before you quote this at someone: search-time parsing is
        only retroactive for the extractions that happen at search time — anything Splunk
        does at index time is baked in just like the others. And ingest-time products can
        recover history if you kept the original raw data somewhere and re-ingest it,
        which is a real project, not a checkbox.
      </p>
    </div>
  )
}
