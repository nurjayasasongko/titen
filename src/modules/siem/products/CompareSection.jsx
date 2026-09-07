import { useState } from 'react'
import ComparisonTable from './ComparisonTable.jsx'
import LatencyDemo from './LatencyDemo.jsx'
import ParseTimeDemo from './ParseTimeDemo.jsx'

const demos = [
  {
    id: 'latency',
    title: 'When does it tell you?',
    subtitle: 'Streaming engine vs scheduled search',
    lead: 'Both engines are configured with the identical rule. Only the way they watch differs — and that decides how long the attacker gets.',
  },
  {
    id: 'parsetime',
    title: 'Can you fix history?',
    subtitle: 'Parsing at ingest vs at search time',
    lead: 'A parser gets deployed broken and fixed three days later. Whether last week repairs itself depends entirely on when the product parses.',
  },
]

/**
 * Cross-product comparison, kept out of any single product's page — a
 * behavioural side-by-side first, then the vocabulary table.
 */
export default function CompareSection() {
  const [demoId, setDemoId] = useState(demos[0].id)
  const demo = demos.find((item) => item.id === demoId)

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Where the three actually behave differently
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Different names for the same component is just vocabulary — you can look that
          up. These two are real behavioural differences: they change what you are able to
          detect, and what you are able to investigate afterwards.
        </p>

        <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
          {demos.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDemoId(item.id)}
              aria-pressed={item.id === demoId}
              className={`flex-1 rounded-md px-3 py-2 text-left transition-colors sm:flex-none ${
                item.id === demoId
                  ? 'bg-white shadow-sm dark:bg-slate-950'
                  : 'hover:bg-white/60 dark:hover:bg-slate-950/50'
              }`}
            >
              <span
                className={`block text-xs font-semibold ${
                  item.id === demoId
                    ? 'text-slate-900 dark:text-slate-50'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.title}
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                {item.subtitle}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {demo.lead}
        </p>

        <div className="mt-4">
          {demoId === 'latency' ? <LatencyDemo /> : <ParseTimeDemo />}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Same job, three vocabularies
        </h2>
        <p className="mt-1 mb-4 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          The row is a job every SIEM has to do. The columns are what each product calls
          it. This is the table to keep open for your first month on an unfamiliar
          platform.
        </p>
        <ComparisonTable />
      </section>
    </div>
  )
}
