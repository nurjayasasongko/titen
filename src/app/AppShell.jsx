import HomePage from './HomePage.jsx'
import { getModule } from '../modules/registry.js'
import { useHashRoute } from '../lib/router.js'

/**
 * Site frame. The landing is a full-bleed branded page that owns its own
 * nav (see HomePage); a module view gets the compact shell chrome —
 * breadcrumb, theme toggle, footer.
 */
export default function AppShell() {
  const [segments, navigate] = useHashRoute()

  const module = segments.length ? getModule(segments[0]) : null
  const isModuleOpen = Boolean(module?.component)

  if (!isModuleOpen) {
    return (
      <div className="titen-shell">
        <HomePage onOpen={(id) => navigate([id])} onNavigate={navigate} />
      </div>
    )
  }

  const ModuleView = module.component
  const viewLabel = module.views?.find(
    (view) => view.id === (segments[1] ?? module.defaultView),
  )?.label

  return (
    <div className="titen-shell">
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate([])}
              className="flex items-center gap-2 font-mono text-lg font-semibold text-[color:var(--text)]"
            >
              titen<span className="cursor" />
            </button>
            <nav aria-label="Breadcrumb" className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => navigate([])}
                className="text-[color:var(--text-dim)] transition-colors hover:text-[color:var(--text)]"
              >
                ~/modules
              </button>
              <span className="text-[color:var(--text-dim)] opacity-50">/</span>
              <button
                type="button"
                onClick={() => navigate([module.id])}
                className="font-medium text-[color:var(--text)] transition-colors hover:opacity-80"
              >
                {module.id}
              </button>
              {viewLabel ? (
                <>
                  <span className="text-[color:var(--text-dim)] opacity-50">/</span>
                  <span className="text-[color:var(--text-dim)]">{viewLabel}</span>
                </>
              ) : null}
            </nav>
          </div>
        </header>

        <ModuleView segments={segments.slice(1)} navigate={(inner) => navigate([module.id, ...inner])} />

        <footer
          className="mt-4 border-t pt-4 font-mono text-[11px] leading-relaxed text-[color:var(--text-dim)]"
          style={{ borderColor: 'var(--border)' }}
        >
          Every screen here is a link — copy the address bar to send someone straight to one
          lesson. Component names and behaviour follow each vendor’s own documentation; the
          concept modules are deliberately vendor-neutral.
        </footer>
      </div>
    </div>
  )
}
