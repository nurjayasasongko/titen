import { useState } from 'react'
import BodyLimitDemo from './BodyLimitDemo.jsx'
import ImplementationTopology from './ImplementationTopology.jsx'
import { comparison, implementations } from '../data/implementations.js'

export default function ImplementationsView() {
  const [selected, setSelected] = useState(implementations[0].id)
  const highlight = selected

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          The same ideas, three places you might meet them
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Everything in Level 1 was described using the open-source model, because that is
          the one whose internals you can read. Here is how the same mechanisms are
          expressed in two managed services — and where the shape genuinely differs rather
          than just the vocabulary.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {implementations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              aria-pressed={selected === item.id}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                highlight === item.id
                  ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                  : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {item.name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.flavour}</p>
              <p className="mt-1.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                {item.summary}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Where it actually sits, running
          </h3>
          <p className="mt-0.5 mb-3 max-w-3xl text-xs text-slate-600 dark:text-slate-400">
            Same traffic, same attacker, three placements. The dashed green line is the
            edge of your own infrastructure — watch which side of it each one refuses a
            request on.
          </p>
          <ImplementationTopology id={selected} />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="w-48 py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">
                  The mechanism
                </th>
                {implementations.map((item) => (
                  <th
                    key={item.id}
                    className={`py-2 pr-4 font-semibold ${
                      highlight === item.id
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr
                  key={row.topic}
                  className="border-b border-slate-100 align-top dark:border-slate-800/60"
                >
                  <th
                    scope="row"
                    className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200"
                  >
                    {row.topic}
                  </th>
                  {implementations.map((item) => {
                    const [name, note] = row[item.id]
                    return (
                      <td
                        key={item.id}
                        className={`py-2.5 pr-4 ${
                          highlight && highlight !== item.id ? 'opacity-60' : ''
                        }`}
                      >
                        <span className="block font-medium text-slate-800 dark:text-slate-100">
                          {name}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          {note}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            The one row that is a real difference, not a translation:
          </span>{' '}
          how a block is decided. CRS and Cloudflare accumulate a score and compare it once
          at the end; AWS WAF evaluates rules in priority order and the first terminating
          action ends it. Everything you learned about thresholds in lesson 4 applies
          directly to two of these columns and not at all to the third.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          What none of them can see
        </h2>
        <p className="mt-1 mb-4 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Rule quality is the argument everyone has. This is the limit nobody mentions, and
          it sits underneath every rule set equally.
        </p>
        <BodyLimitDemo />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Where these numbers come from
        </h2>
        <ul className="mt-2 space-y-1.5">
          {implementations.map((item) => (
            <li key={item.id} className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {item.name}:
              </span>{' '}
              <a
                href={item.docs.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-sky-600 dark:hover:text-sky-400"
              >
                {item.docs.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          The rule IDs, messages, severities and paranoia levels used throughout Level 1 are
          taken verbatim from the CRS source. The pattern matching behind them is simplified —
          the real rules use libinjection and considerably longer regular expressions — but
          the scoring, the levels and the transformation pipelines behave as documented.
        </p>
      </section>
    </div>
  )
}
