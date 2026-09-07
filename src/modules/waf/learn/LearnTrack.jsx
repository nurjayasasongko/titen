import EvasionDemo from './EvasionDemo.jsx'
import ParanoiaDemo from './ParanoiaDemo.jsx'
import PhasesDemo from './PhasesDemo.jsx'
import ScoringDemo from './ScoringDemo.jsx'
import SeesDemo from './SeesDemo.jsx'
import TuningDemo from './TuningDemo.jsx'
import WafTopology from './WafTopology.jsx'
import LessonTrack from '../../../components/lessons/LessonTrack.jsx'
import { lessons } from '../data/lessons.js'
import { comparison } from '../data/implementations.js'

const demos = {
  sees: SeesDemo,
  phases: PhasesDemo,
  evasion: EvasionDemo,
  scoring: ScoringDemo,
  paranoia: ParanoiaDemo,
  tuning: TuningDemo,
}

export default function LearnTrack({ lessonId, onLessonChange, onOpenImplementations }) {
  /** The WAF bridge: how this lesson's mechanism looks in real products. */
  function renderBridge(lesson) {
    const rows = comparison.filter((row) => row.lesson === lesson.id)
    if (!rows.length) return null
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">
          How this looks in a product you might actually be handed
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          Same mechanism, three configurations. Open the comparison for the full table.
        </p>
        <div className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <div key={row.topic}>
              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                {row.topic}
              </p>
              <div className="mt-1 grid gap-2 sm:grid-cols-3">
                {['modsec', 'aws', 'cloudflare'].map((key) => {
                  const [name, note] = row[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={onOpenImplementations}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-left transition-colors hover:border-sky-400 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-600 dark:hover:bg-sky-950"
                    >
                      <span className="block text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                        {name}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                        {note}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
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
      overview={<WafTopology onLessonJump={onLessonChange} />}
      renderBridge={renderBridge}
      finalCta={{
        label: 'Now see how three real WAFs express all of this',
        onClick: onOpenImplementations,
      }}
    />
  )
}
