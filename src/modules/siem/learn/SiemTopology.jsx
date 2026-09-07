import TopologyScene from '../../../components/topology/TopologyScene.jsx'
import spec from '../data/learn/topology.js'

export default function SiemTopology({ onLessonJump }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          The whole estate, from above
        </h2>
        <p className="mt-0.5 max-w-2xl text-xs text-slate-600 dark:text-slate-400">
          Every machine writing logs, cabled into one pipeline. Watch the traffic actually
          move: thousands of events go in on the left and almost nothing comes out on the
          right. That narrowing is the entire job of a SIEM.
        </p>
      </header>

      <TopologyScene
        spec={spec}
        key={spec.id}
        footnote={
          <>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Watch the colours change as packets cross a box.
            </span>{' '}
            Grey goes into the parser and blue comes out — that is raw text becoming named
            fields. Amber ones are failed logins; the correlation box counts them, and only
            when the count crosses the line does a single red diamond leave for the
            dashboard.{' '}
            {onLessonJump ? (
              <button
                type="button"
                onClick={() => onLessonJump('correlate')}
                className="underline underline-offset-2 hover:text-sky-600 dark:hover:text-sky-400"
              >
                Open the lesson on that counting →
              </button>
            ) : null}
          </>
        }
      />
    </section>
  )
}
