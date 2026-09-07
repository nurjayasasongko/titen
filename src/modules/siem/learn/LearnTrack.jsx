import AlertDemo from './AlertDemo.jsx'
import CollectDemo from './CollectDemo.jsx'
import CorrelateDemo from './CorrelateDemo.jsx'
import ParseDemo from './ParseDemo.jsx'
import SiemTopology from './SiemTopology.jsx'
import WhySiemDemo from './WhySiemDemo.jsx'
import LessonTrack from '../../../components/lessons/LessonTrack.jsx'
import { lessons } from '../data/learn/lessons.js'
import { products } from '../data/products.js'

const demos = {
  why: WhySiemDemo,
  collect: CollectDemo,
  parse: ParseDemo,
  correlate: CorrelateDemo,
  alert: AlertDemo,
}

export default function LearnTrack({ lessonId, onLessonChange, onJumpToProduct }) {
  /** The SIEM-specific bridge: the same idea, named three different ways. */
  function renderBridge(lesson) {
    if (!lesson.productMap) return null
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">
          {lesson.productMap.label}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          Same idea, three sets of names. Click one to open it in the real architecture.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {products.map((product) => {
            const [text, nodeId] = lesson.productMap[product.id]
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onJumpToProduct(product.id, nodeId)}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-left transition-colors hover:border-sky-400 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-600 dark:hover:bg-sky-950"
              >
                <span className="block text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                  {product.name}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                  {text}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <LessonTrack
      lessons={lessons}
      demos={demos}
      lessonId={lessonId}
      onLessonChange={onLessonChange}
      overview={<SiemTopology onLessonJump={onLessonChange} />}
      renderBridge={renderBridge}
      finalCta={{
        label: 'You know the concepts — now see them in real products',
        onClick: () => onJumpToProduct(products[0].id, null),
      }}
    />
  )
}
