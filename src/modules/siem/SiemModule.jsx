import LearnTrack from './learn/LearnTrack.jsx'
import TraceExplorer from './products/TraceExplorer.jsx'
import manifest from './index.js'
import { lessons } from './data/learn/lessons.js'

/**
 * The SIEM module. It owns its own routes below the module segment:
 *
 *   /siem/learn/<lessonId>
 *   /siem/products/<productId>/<componentId>
 *   /siem/compare
 */
export default function SiemModule({ segments, navigate }) {
  const view = segments[0] === 'products' || segments[0] === 'compare'
    ? segments[0]
    : manifest.defaultView

  const lessonId = view === 'learn'
    ? (lessons.find((lesson) => lesson.id === segments[1])?.id ?? lessons[0].id)
    : lessons[0].id

  const target = view === 'products'
    ? {
        productId: segments[1] ?? 'qradar',
        nodeId: segments[2] ?? null,
        nonce: segments.join('/'),
      }
    : null

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Section">
        <ul className="grid gap-2 sm:grid-cols-2">
          {manifest.views.map((item, index) => {
            const isCurrent =
              item.id === view || (item.id === 'products' && view === 'compare')
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
          onJumpToProduct={(productId, nodeId) =>
            navigate(['products', productId, nodeId])
          }
        />
      ) : (
        <TraceExplorer
          target={target}
          compare={view === 'compare'}
          onTabChange={(tabId) =>
            navigate(tabId === 'compare' ? ['compare'] : ['products', tabId])
          }
        />
      )}
    </div>
  )
}
