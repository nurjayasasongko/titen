import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useOffscreen } from '../lib/useOffscreen.js'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

/**
 * A playback control that follows the reader.
 *
 * The inline controls sit above the thing they drive, which is fine until
 * you scroll down to actually watch it — at which point pausing meant
 * scrolling back up. This renders a floating twin once the inline control
 * leaves the screen, and gets out of the way again when it returns.
 *
 * `anchorRef` is the inline control's container. Escape pauses.
 */
export default function PlaybackDock({
  anchorRef,
  isPlaying,
  onTogglePlay,
  onPrev = null,
  onNext = null,
  label,
  progress = null,
}) {
  const offscreen = useOffscreen(anchorRef)
  // Once someone has used the floating control it stays available, so
  // pausing does not make the way to resume disappear from under them.
  const [pinned, setPinned] = useState(false)
  const visible = offscreen && (isPlaying || pinned)

  useEffect(() => {
    if (!visible || !isPlaying) return
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setPinned(true)
      onTogglePlay()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, isPlaying, onTogglePlay])

  const button =
    'flex size-9 shrink-0 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-700'

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18 }}
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          className="fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-300 bg-white/95 py-1.5 pr-3 pl-1.5 shadow-xl backdrop-blur sm:left-auto sm:right-6 sm:translate-x-0 dark:border-slate-600 dark:bg-slate-800/95"
        >
          {onPrev ? (
            <button type="button" onClick={onPrev} aria-label="Previous" className={button}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setPinned(true)
              onTogglePlay()
            }}
            aria-pressed={isPlaying}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white transition-colors hover:bg-sky-700"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
            <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {onNext ? (
            <button type="button" onClick={onNext} aria-label="Next" className={button}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          ) : null}

          <span className="ml-1 flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[11px] font-medium text-slate-900 dark:text-slate-50">
              {label}
            </span>
            {progress ? (
              <span className="truncate text-[10px] text-slate-500 tabular-nums dark:text-slate-400">
                {progress}
              </span>
            ) : null}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
