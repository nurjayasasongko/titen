import { AnimatePresence, motion } from 'framer-motion'
import { phases } from '../../../lib/phases.js'
import StageIcon from '../../../components/StageIcon.jsx'

function LogBlock({ log }) {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {log.label}
      </figcaption>
      <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3.5 text-[11px] leading-relaxed text-slate-100">
        <code className="font-mono">{log.code}</code>
      </pre>
    </figure>
  )
}

export default function NodeDetail({ node, zone, engineStep, onSelectStep }) {
  const phase = phases[node.phase]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={node.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22 }}
        className="grid gap-6 lg:grid-cols-2 lg:gap-8"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${phase.chip}`}>
              {phase.label}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              runs in: {zone?.label}
            </span>
          </div>

          <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
            <StageIcon name={node.icon} className="size-5 text-sky-500" />
            {node.name}
          </h2>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{node.proc}</p>

          <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
            {node.what}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {node.how}
          </p>

          {node.engine ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Inside the {node.engine.name}
              </p>
              {node.engine.note ? (
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {node.engine.note}
                </p>
              ) : null}
              <ol className="mt-3 space-y-1.5">
                {node.engine.steps.map(([name, detail], index) => {
                  const isActive = index === engineStep
                  return (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => onSelectStep(index)}
                        aria-expanded={isActive}
                        className={`w-full rounded-md border p-2.5 text-left transition-colors ${
                          isActive
                            ? 'border-sky-400 bg-white dark:border-sky-600 dark:bg-slate-950'
                            : 'border-transparent hover:bg-white dark:hover:bg-slate-950/60'
                        }`}
                      >
                        <span className="flex items-baseline gap-2">
                          <span
                            className={`font-mono text-[10px] ${
                              isActive
                                ? 'text-sky-600 dark:text-sky-400'
                                : 'text-slate-400 dark:text-slate-600'
                            }`}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                            {name}
                          </span>
                        </span>
                        <AnimatePresence initial={false}>
                          {isActive ? (
                            <motion.span
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="block overflow-hidden"
                            >
                              <span className="mt-1.5 block pl-6 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                {detail}
                              </span>
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <LogBlock log={node.log} />

          {node.config?.length ? (
            <dl className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 text-xs dark:divide-slate-800 dark:border-slate-800">
              {node.config.map(([label, value], index) => (
                <div key={`${label}-${index}`} className="grid grid-cols-[9rem_1fr] gap-2 p-2.5">
                  <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="font-mono text-[11px] break-words text-slate-800 dark:text-slate-200">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
