export default function ProductTabs({ items, selectedId, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="SIEM product"
      className="flex flex-wrap gap-1 rounded-xl border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
    >
      {items.map((product) => {
        const isSelected = product.id === selectedId
        return (
          <button
            key={product.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(product.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-left transition-colors sm:flex-none sm:px-4 ${
              product.standalone ? 'sm:ml-2 sm:border-l sm:border-slate-300 sm:pl-4 sm:dark:border-slate-700' : ''
            } ${
              isSelected
                ? 'bg-white shadow-sm dark:bg-slate-950'
                : 'hover:bg-white/60 dark:hover:bg-slate-950/50'
            }`}
          >
            <span
              className={`block text-sm font-semibold ${
                isSelected
                  ? 'text-slate-900 dark:text-slate-50'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {product.name}
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-500">
              {product.vendor}
            </span>
          </button>
        )
      })}
    </div>
  )
}
