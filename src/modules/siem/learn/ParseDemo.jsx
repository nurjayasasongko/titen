import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { changeTags, closingPoint, samples, schemaFields } from '../data/learn/parsing.js'

// phases of the lesson: nothing done, parsed only, parsed + normalised
const PHASES = ['raw', 'parsed', 'normalised']

const tagTone = {
  renamed: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  reformatted: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  trimmed: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  mapped: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  inferred: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
}

export default function ParseDemo() {
  const [sampleId, setSampleId] = useState('windows')
  const [phase, setPhase] = useState('raw')

  const sample = samples.find((item) => item.id === sampleId)
  const phaseIndex = PHASES.indexOf(phase)
  const showParsed = phaseIndex >= 1
  const showNormalised = phaseIndex >= 2

  return (
    <div className="flex flex-col gap-4">
      {/* which source we are reading */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Log source:</span>
        {samples.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSampleId(item.id)}
            aria-pressed={item.id === sampleId}
            className={`rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
              item.id === sampleId
                ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600'
            }`}
          >
            <span className="block font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400">{item.sublabel}</span>
          </button>
        ))}
      </div>

      {/* two clearly-separated jobs */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div
          className={`rounded-lg border-2 p-2.5 transition-colors ${
            phase === 'raw'
              ? 'border-sky-400 bg-sky-50/60 dark:border-sky-600 dark:bg-sky-950/30'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
          }`}
        >
          <p className="text-[11px] font-bold tracking-wide text-slate-800 uppercase dark:text-slate-200">
            1 · Parse
          </p>
          <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">
            Pull values out of the raw text into fields. Format-specific — this source uses a{' '}
            <span className="font-mono">{sample.parser}</span>.
          </p>
        </div>
        <div
          className={`rounded-lg border-2 p-2.5 transition-colors ${
            showNormalised
              ? 'border-violet-400 bg-violet-50/60 dark:border-violet-600 dark:bg-violet-950/30'
              : 'border-slate-200 bg-white opacity-60 dark:border-slate-800 dark:bg-slate-950'
          }`}
        >
          <p className="text-[11px] font-bold tracking-wide text-slate-800 uppercase dark:text-slate-200">
            2 · Normalise
          </p>
          <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">
            Map those source-named fields onto one shared schema, and rewrite values like the
            outcome into a shared vocabulary.
          </p>
        </div>
      </div>

      {/* raw text */}
      <div>
        <p className="mb-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Raw log, exactly as {sample.label} wrote it
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300">
          <code className="font-mono">{sample.raw}</code>
        </pre>
      </div>

      {/* the field table: left half = parse, right half = normalise */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[42rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="bg-sky-50/60 px-3 py-2 font-semibold text-sky-800 dark:bg-sky-950/40 dark:text-sky-300" colSpan={2}>
                Parsed — the source’s own field names
              </th>
              <th className="w-6" aria-hidden="true" />
              <th className="bg-violet-50/60 px-3 py-2 font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-300" colSpan={3}>
                Normalised — the shared schema
              </th>
            </tr>
          </thead>
          <tbody>
            {schemaFields.map((field) => {
              const cell = sample.fields[field.id]
              return (
                <tr key={field.id} className="border-b border-slate-100 align-top dark:border-slate-800/60">
                  {/* parse side */}
                  <td className="px-3 py-2">
                    <AnimatePresence mode="wait">
                      {showParsed ? (
                        <motion.span
                          key="p"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="font-mono text-[11px] text-slate-600 dark:text-slate-400"
                        >
                          {cell.rawName}
                        </motion.span>
                      ) : (
                        <span key="e" className="font-mono text-[11px] text-slate-300 dark:text-slate-700">
                          —
                        </span>
                      )}
                    </AnimatePresence>
                  </td>
                  <td className="px-3 py-2">
                    {showParsed ? (
                      <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                        {cell.rawValue}
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-slate-300 dark:text-slate-700">—</span>
                    )}
                  </td>

                  {/* arrow */}
                  <td className="px-1 text-center text-slate-400 dark:text-slate-600">
                    {showNormalised ? '→' : ''}
                  </td>

                  {/* normalise side */}
                  <td className="px-3 py-2">
                    {showNormalised ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-mono text-[11px] text-violet-700 dark:text-violet-300"
                      >
                        {field.schema}
                      </motion.span>
                    ) : (
                      <span className="font-mono text-[11px] text-slate-300 dark:text-slate-700">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {showNormalised ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`font-mono text-[11px] font-semibold ${
                          cell.change === 'inferred' || cell.change === 'mapped'
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {cell.value}
                      </motion.span>
                    ) : (
                      <span className="font-mono text-[11px] text-slate-300 dark:text-slate-700">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {showNormalised ? (
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${tagTone[cell.change]}`}>
                        {cell.change}
                      </span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* the note for the current phase */}
      <AnimatePresence mode="wait">
        {phase !== 'raw' ? (
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-lg border p-3 text-xs leading-relaxed ${
              phase === 'parsed'
                ? 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
                : 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200'
            }`}
          >
            <span className="font-semibold">{phase === 'parsed' ? 'Parsing: ' : 'Normalising: '}</span>
            {phase === 'parsed' ? sample.parseNote : sample.normaliseNote}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPhase('parsed')}
          disabled={phase !== 'raw'}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-40"
        >
          1 · Parse it
        </button>
        <button
          type="button"
          onClick={() => setPhase('normalised')}
          disabled={phase !== 'parsed'}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
        >
          2 · Normalise it
        </button>
        <button
          type="button"
          onClick={() => setPhase('raw')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Reset
        </button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {phase === 'raw'
            ? 'Parse first, then normalise — two separate steps.'
            : phase === 'parsed'
              ? 'Fields pulled out, still named the source’s way. Now normalise →'
              : 'Now switch log source above: the left half changes completely, the right half stays identical.'}
        </span>
      </div>

      {/* change-tag legend */}
      {showNormalised ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
          {Object.entries(changeTags).map(([tag, meaning]) => (
            <span key={tag} className="flex items-center gap-1">
              <span className={`rounded px-1 py-0.5 font-medium ${tagTone[tag]}`}>{tag}</span>
              {meaning}
            </span>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {closingPoint}
      </div>
    </div>
  )
}
