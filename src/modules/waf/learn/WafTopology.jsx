import TopologyScene from '../../../components/topology/TopologyScene.jsx'
import spec from '../data/topology/concept.js'

export default function WafTopology({ onLessonJump }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Everything arriving on port 443, from above
        </h2>
        <p className="mt-0.5 max-w-2xl text-xs text-slate-600 dark:text-slate-400">
          Customers, integrations and an attacker all come down the same wire. Watch what
          reaches your application and what does not — then push the paranoia dial and
          watch both of those change at once.
        </p>
      </header>

      <TopologyScene
        key={spec.id}
        spec={spec}
        footnote={
          <>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Press “Turn the paranoia up” a few times and watch two numbers move the wrong
              way together.
            </span>{' '}
            At PL1 a few attacks reach your app. At PL4 none do — and a large share of
            ordinary customers are getting a 403 instead of their order confirmation. There
            is no setting where both numbers are zero, which is the entire job.{' '}
            {onLessonJump ? (
              <button
                type="button"
                onClick={() => onLessonJump('paranoia')}
                className="underline underline-offset-2 hover:text-sky-600 dark:hover:text-sky-400"
              >
                Open the lesson on that dial →
              </button>
            ) : null}
          </>
        }
      />
    </section>
  )
}
