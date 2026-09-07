import { phaseOrder, phases } from '../../../lib/phases.js'

/** The cross-product thread: colour tells you which job a component does. */
export default function PhaseLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
      <li className="font-medium text-slate-500 dark:text-slate-500">Component does:</li>
      {phaseOrder.map((id) => (
        <li key={id} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${phases[id].dot}`} />
          {phases[id].label}
        </li>
      ))}
    </ul>
  )
}
