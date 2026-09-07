import ImplementationsView from './implementations/ImplementationsView.jsx'
import LearnTrack from './learn/LearnTrack.jsx'
import manifest from './index.js'
import { lessons } from './data/lessons.js'

/**
 * Routes below the module segment:
 *   /waf/learn/<lessonId>
 *   /waf/implementations
 */
export default function WafModule({ segments, navigate }) {
  const view = segments[0] === 'implementations' ? 'implementations' : manifest.defaultView
  const lessonId =
    lessons.find((lesson) => lesson.id === segments[1])?.id ?? lessons[0].id

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Section">
        <ul className="grid gap-2 sm:grid-cols-2">
          {manifest.views.map((item, index) => {
            const isCurrent = item.id === view
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate([item.id])}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${
                    isCurrent
                      ? 'border-sky-500 bg-white dark:border-sky-500 dark:bg-slate-950'
                      : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isCurrent
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span
                        className={`block text-sm font-semibold ${
                          isCurrent
                            ? 'text-slate-900 dark:text-slate-50'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        {item.note}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {view === 'learn' ? (
        <LearnTrack
          lessonId={lessonId}
          onLessonChange={(id) => navigate(['learn', id])}
          onOpenImplementations={() => navigate(['implementations'])}
        />
      ) : (
        <ImplementationsView />
      )}
    </div>
  )
}
