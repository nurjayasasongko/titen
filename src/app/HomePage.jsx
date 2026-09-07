import { useState } from 'react'
import StageIcon from '../components/StageIcon.jsx'
import HeroPipeline from './HeroPipeline.jsx'
import { modules } from '../modules/registry.js'

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function ModuleCard({ module, onOpen }) {
  const isReady = Boolean(module.component)
  return (
    <article
      className={`rounded-lg p-[18px] ${isReady ? 'surface glow-hover cursor-pointer' : 'surface'}`}
      style={isReady ? { borderColor: 'var(--blue)' } : undefined}
      onClick={isReady ? () => onOpen(module.id) : undefined}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] font-medium text-[color:var(--text)]">
          <StageIcon name={module.icon} className="size-4 text-[color:var(--text-dim)]" />
          {module.name}
        </span>
        <span
          className="shrink-0 rounded-full px-2 py-[3px] font-mono text-[10px]"
          style={
            isReady
              ? { background: 'rgba(77,141,255,0.15)', color: 'var(--blue)' }
              : { background: 'var(--surface-2)', color: 'var(--text-dim)' }
          }
        >
          {isReady ? 'ready' : 'planned'}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-[color:var(--text-dim)]">{module.summary}</p>
    </article>
  )
}

function ForkScreen({ onEnter }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* deliberately the plainest screen on the site: no mesh, no demo */}
      <div className="px-6 py-5 sm:px-10">
        <span className="flex items-center gap-2 font-mono text-[18px] font-semibold text-[color:var(--text)]">
          titen<span className="cursor" />
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-xl text-center">
          <span className="font-mono text-[11px] tracking-[0.22em] text-[color:var(--text-dim)] uppercase">
            SOC fundamentals
          </span>
          <h1 className="mt-4 font-display text-[28px] leading-[1.2] font-semibold tracking-[-0.5px] text-[color:var(--text)] sm:text-[38px]">
            Understand what&rsquo;s actually happening.
          </h1>
          <p className="mt-3 text-[15px] text-[color:var(--text-dim)] sm:text-[16px]">
            Learn security concepts by watching them execute.
          </p>

          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => onEnter('zero')}
              className="btn-terminal rounded-lg px-6 py-3.5 font-mono text-[14px]"
            >
              Start from zero
            </button>
            <button
              type="button"
              onClick={() => onEnter('basics')}
              className="btn-terminal rounded-lg px-6 py-3.5 font-mono text-[14px]"
            >
              I know the basics
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage({ onOpen, onNavigate }) {
  const ready = modules.filter((module) => module.component).length
  const [stage, setStage] = useState('fork')

  if (stage === 'fork') {
    // routing per choice is deliberately not wired yet — both paths reveal the
    // hero for now while the copy and layout are confirmed
    return <ForkScreen onEnter={() => setStage('enter')} />
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="mesh" aria-hidden="true" />

      {/* nav */}
      <nav
        className="relative z-10 flex items-center justify-between border-b px-6 py-5 sm:px-10"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          onClick={() => scrollTo('top')}
          className="flex items-center gap-2 font-mono text-[18px] font-semibold text-[color:var(--text)]"
        >
          titen<span className="cursor" />
        </button>
        <div className="flex gap-5 font-mono text-[13px] text-[color:var(--text-dim)] sm:gap-7 sm:text-[14px]">
          <button type="button" onClick={() => scrollTo('modules')} className="transition-colors hover:text-[color:var(--text)]">
            modules
          </button>
          <button type="button" onClick={() => scrollTo('modules')} className="transition-colors hover:text-[color:var(--text)]">
            why this exists
          </button>
        </div>
      </nav>

      {/* hero */}
      <section
        id="top"
        className="relative z-10 mx-auto grid max-w-[1100px] items-center gap-10 px-6 pt-16 pb-14 sm:px-10 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14"
      >
        <div>
          <h1 className="font-display text-[30px] leading-[1.25] font-semibold tracking-[-0.5px] text-[color:var(--text)] sm:text-[40px]">
            Watch how security
            <br />
            systems <span className="gradient-text">actually</span>
            <br />
            work.
          </h1>
          <p className="mt-4 max-w-[46ch] text-[15px] text-[color:var(--text-dim)] sm:text-[16px]">
            Titen — Javanese for knowledge built through repeated, careful observation. Trace a
            real log through a real pipeline and watch it change at every stop, instead of
            memorising a diagram.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-[18px]">
            <button
              type="button"
              onClick={() => onNavigate(['siem', 'learn', 'why'])}
              className="cta px-[22px] py-[13px] text-[14px]"
            >
              $ open siem --lesson=1
            </button>
            <button type="button" onClick={() => scrollTo('modules')} className="cta-ghost text-[14px]">
              why this exists →
            </button>
          </div>
        </div>

        <HeroPipeline />
      </section>

      {/* modules */}
      <section id="modules" className="relative z-10 mx-auto max-w-[1100px] scroll-mt-6 px-6 pb-24 sm:px-10">
        <div
          className="mb-6 flex items-baseline justify-between border-b pb-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-[18px] font-medium text-[color:var(--text)]">All modules</h2>
          <span className="font-mono text-[13px] text-[color:var(--text-dim)]">
            {ready} / {modules.length} shipped
          </span>
        </div>
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} onOpen={onOpen} />
          ))}
        </div>
      </section>
    </div>
  )
}
