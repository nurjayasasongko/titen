import { AnimatePresence, motion } from 'framer-motion'

/**
 * The lesson shell every module shares: a numbered rail, one interactive
 * demo, the words that go with it, and an optional bridge into whatever
 * the module's second level is.
 *
 * Modules supply the content and the demo components; this file owns the
 * layout so a new module gets the same shape for free.
 */
export default function LessonTrack({
  lessons,
  demos,
  lessonId,
  onLessonChange,
  overview = null,
  renderBridge = null,
  finalCta = null,
}) {
  const index = Math.max(0, lessons.findIndex((lesson) => lesson.id === lessonId))
  const lesson = lessons[index]
  const Demo = demos[lesson.id]
  const isLast = index === lessons.length - 1

  return (
    <div className="flex flex-col gap-5">
      {overview}

      <nav aria-label="Lessons">
        <ol className="flex flex-wrap gap-1.5">
          {lessons.map((item, position) => {
            const isCurrent = item.id === lesson.id
            const isDone = position < index
            return (
              <li key={item.id} className="min-w-[8.5rem] flex-1">
                <button
                  type="button"
                  onClick={() => onLessonChange(item.id)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`w-full rounded-lg border p-2 text-left transition-colors ${
                    isCurrent
                      ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                      : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600'
                  }`}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-sky-600 text-white'
                        : isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isDone ? '✓' : item.number}
                  </span>
                  <span
                    className={`mt-1 block text-[11px] leading-tight ${
                      isCurrent
                        ? 'font-semibold text-slate-900 dark:text-slate-50'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.title.split(' — ')[0]}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <AnimatePresence mode="wait">
        <motion.article
          key={lesson.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="flex flex-col gap-5"
        >
          <header>
            <p className="text-xs font-medium text-sky-600 dark:text-sky-400">
              Lesson {lesson.number} of {lessons.length}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900 sm:text-xl dark:text-slate-50">
              {lesson.title}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 italic dark:text-slate-300">
              “{lesson.question}”
            </p>
          </header>

          <section
            aria-label="Interactive demonstration"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/60"
          >
            {Demo ? <Demo /> : null}
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              {lesson.idea.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950/50">
                <p className="text-[10px] font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-400">
                  The one thing to remember
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                  {lesson.takeaway}
                </p>
              </div>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                <p className="text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-400">
                  Where this bites in real life
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                  {lesson.gotcha}
                </p>
              </div>
            </div>
          </section>

          {renderBridge ? renderBridge(lesson) : null}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onLessonChange(lessons[index - 1].id)}
              disabled={index === 0}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              ← Previous
            </button>
            {!isLast ? (
              <button
                type="button"
                onClick={() => onLessonChange(lessons[index + 1].id)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Next: {lessons[index + 1].title.split(' — ')[0]} →
              </button>
            ) : finalCta ? (
              <button
                type="button"
                onClick={finalCta.onClick}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {finalCta.label} →
              </button>
            ) : null}
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  )
}
