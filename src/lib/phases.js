/**
 * The five things every SIEM does, whatever it calls them. Each product's
 * components are tagged with a phase so you can see that (for example)
 * QRadar's ecs-ec and Splunk's parsing pipeline are the same job.
 */
export const phases = {
  source: {
    label: 'Generate',
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    ring: 'border-slate-300 dark:border-slate-700',
    active: 'border-slate-500 dark:border-slate-400',
  },
  collect: {
    label: 'Collect',
    dot: 'bg-sky-500',
    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    ring: 'border-sky-200 dark:border-sky-900',
    active: 'border-sky-500 dark:border-sky-400',
  },
  parse: {
    label: 'Parse & normalise',
    dot: 'bg-violet-500',
    chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
    ring: 'border-violet-200 dark:border-violet-900',
    active: 'border-violet-500 dark:border-violet-400',
  },
  correlate: {
    label: 'Correlate',
    dot: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
    ring: 'border-amber-200 dark:border-amber-900',
    active: 'border-amber-500 dark:border-amber-400',
  },
  store: {
    label: 'Store',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    ring: 'border-emerald-200 dark:border-emerald-900',
    active: 'border-emerald-500 dark:border-emerald-400',
  },
  present: {
    label: 'Present',
    dot: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    ring: 'border-rose-200 dark:border-rose-900',
    active: 'border-rose-500 dark:border-rose-400',
  },
}

export const phaseOrder = ['source', 'collect', 'parse', 'correlate', 'store', 'present']
