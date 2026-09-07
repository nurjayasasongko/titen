import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const BUFFER_LIMIT = 8
const EMIT_MS = 900
const TRAVEL_MS = 1500

/**
 * Collection, and the thing nobody explains to new analysts: what happens
 * to the logs while the link is down, and what happens when the buffer
 * behind that link fills up.
 */
export default function CollectDemo() {
  const [linkUp, setLinkUp] = useState(true)
  const [inFlight, setInFlight] = useState([])
  const [buffered, setBuffered] = useState(0)
  const [received, setReceived] = useState(0)
  const [dropped, setDropped] = useState(0)
  const nextId = useRef(0)

  // the host keeps writing logs no matter what the network is doing
  useEffect(() => {
    const timer = setInterval(() => {
      if (linkUp) {
        nextId.current += 1
        const id = nextId.current
        setInFlight((current) => [...current, id])
      } else {
        setBuffered((current) => {
          if (current >= BUFFER_LIMIT) {
            setDropped((value) => value + 1)
            return current
          }
          return current + 1
        })
      }
    }, EMIT_MS)
    return () => clearInterval(timer)
  }, [linkUp])

  // once the link is back, the buffer flushes
  useEffect(() => {
    if (!linkUp || buffered === 0) return
    const timer = setTimeout(() => {
      nextId.current += 1
      const id = nextId.current
      setInFlight((current) => [...current, id])
      setBuffered((current) => current - 1)
    }, 260)
    return () => clearTimeout(timer)
  }, [linkUp, buffered])

  function reset() {
    setInFlight([])
    setBuffered(0)
    setReceived(0)
    setDropped(0)
    setLinkUp(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          {/* the machine */}
          <div className="w-[4.5rem] shrink-0 rounded-lg border border-slate-300 bg-slate-50 p-2 text-center sm:w-24 dark:border-slate-700 dark:bg-slate-900">
            <p className="font-mono text-[10px] font-semibold text-slate-800 dark:text-slate-100">
              WIN-APP01
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">agent</p>
            <div className="mt-1.5 flex h-10 flex-col-reverse items-center gap-0.5">
              <AnimatePresence>
                {Array.from({ length: buffered }).map((_, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0 }}
                    className={`h-1 w-10 rounded-full ${
                      buffered >= BUFFER_LIMIT ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />
                ))}
              </AnimatePresence>
            </div>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">
              buffer {buffered}/{BUFFER_LIMIT}
            </p>
          </div>

          {/* the wire */}
          <div className="relative h-16 flex-1">
            <div
              className={`absolute top-1/2 h-0.5 w-full -translate-y-1/2 transition-colors ${
                linkUp
                  ? 'bg-slate-300 dark:bg-slate-700'
                  : 'bg-rose-300 dark:bg-rose-900'
              }`}
              style={linkUp ? undefined : { backgroundImage: 'repeating-linear-gradient(90deg,currentColor 0 6px,transparent 6px 12px)' }}
            />
            {!linkUp ? (
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                link down
              </span>
            ) : null}
            <AnimatePresence>
              {inFlight.map((id) => (
                <motion.span
                  key={id}
                  initial={{ left: '0%', opacity: 0 }}
                  animate={{ left: '100%', opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: TRAVEL_MS / 1000, ease: 'linear' }}
                  onAnimationComplete={() => {
                    setInFlight((current) => current.filter((item) => item !== id))
                    setReceived((value) => value + 1)
                  }}
                  className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-sky-500"
                />
              ))}
            </AnimatePresence>
          </div>

          {/* the SIEM */}
          <div className="w-[4.5rem] shrink-0 rounded-lg border-2 border-sky-400 bg-sky-50 p-2 text-center sm:w-24 dark:border-sky-600 dark:bg-sky-950">
            <p className="font-mono text-[10px] font-semibold text-slate-800 dark:text-slate-100">
              SIEM
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">collector</p>
            <p className="mt-2 font-mono text-lg leading-none font-bold text-sky-600 tabular-nums dark:text-sky-400">
              {received}
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">received</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setLinkUp((value) => !value)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            linkUp
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {linkUp ? 'Cut the network' : 'Restore the network'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Reset
        </button>
        {dropped > 0 ? (
          <span className="rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs font-medium text-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {dropped} event{dropped === 1 ? '' : 's'} lost — buffer was full
          </span>
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Cut the link and watch the buffer fill instead of the counter. Restore it and the
        backlog flushes — those events arrive late, but they arrive. Leave it down past
        {' '}{BUFFER_LIMIT} events and the oldest ones are gone for good, with no error
        anywhere: the machine kept logging, the SIEM simply never heard about it.
      </p>
    </div>
  )
}
