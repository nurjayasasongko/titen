import { phases } from '../../../lib/phases.js'
import { comparison } from '../data/comparison.js'
import { products } from '../data/products.js'

/**
 * The "same job, different name" table. Group by product everywhere else;
 * this one place lines them up so the vocabulary transfers.
 */
export default function ComparisonTable({ highlightId }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th scope="col" className="w-56 py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">
              The job
            </th>
            {products.map((product) => (
              <th
                key={product.id}
                scope="col"
                className={`py-2 pr-4 font-semibold ${
                  product.id === highlightId
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {product.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.map((row) => (
            <tr
              key={row.job}
              className="border-b border-slate-100 align-top dark:border-slate-800/60"
            >
              <th scope="row" className="py-2.5 pr-4 font-normal">
                <span className="flex items-center gap-1.5">
                  <span className={`size-2 shrink-0 rounded-full ${phases[row.phase].dot}`} />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{row.job}</span>
                </span>
              </th>
              {products.map((product) => {
                const [name, note] = row[product.id]
                return (
                  <td
                    key={product.id}
                    className={`py-2.5 pr-4 ${
                      !highlightId || product.id === highlightId ? '' : 'opacity-70'
                    }`}
                  >
                    <span className="block font-medium text-slate-800 dark:text-slate-100">
                      {name}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {note}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
