import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * The problem the SIEM solves, before any SIEM vocabulary is introduced:
 * three machines, three languages, and a human who cannot read all three
 * at once — then the same events in one place, in one language.
 */
const stream = [
  { host: 'WIN-APP01', kind: 'Windows', raw: 'EventCode=4625  Account Name: j.reyes  Source: 203.0.113.47', normal: { time: '09:14:22', user: 'j.reyes', src: '203.0.113.47', action: 'failure' } },
  { host: 'web01', kind: 'Linux', raw: 'sshd[2201]: Failed password for j.reyes from 203.0.113.47', normal: { time: '09:14:41', user: 'j.reyes', src: '203.0.113.47', action: 'failure' } },
  { host: 'fw-edge-01', kind: 'Firewall', raw: '%ASA-6-113005: AAA authentication Rejected : user = j.reyes', normal: { time: '09:15:02', user: 'j.reyes', src: '203.0.113.47', action: 'failure' } },
  { host: 'WIN-APP01', kind: 'Windows', raw: 'EventCode=4625  Account Name: j.reyes  Source: 203.0.113.47', normal: { time: '09:15:20', user: 'j.reyes', src: '203.0.113.47', action: 'failure' } },
  { host: 'web01', kind: 'Linux', raw: 'sshd[2201]: Failed password for j.reyes from 203.0.113.47', normal: { time: '09:15:44', user: 'j.reyes', src: '203.0.113.47', action: 'failure' } },
]

const hosts = [
  { id: 'WIN-APP01', label: 'WIN-APP01', kind: 'Windows server' },
  { id: 'web01', label: 'web01', kind: 'Linux server' },
  { id: 'fw-edge-01', label: 'fw-edge-01', kind: 'Firewall' },
]

export default function WhySiemDemo() {
  const [siemOn, setSiemOn] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (count >= stream.length) return
    const timer = setTimeout(() => setCount((value) => value + 1), 1300)
    return () => clearTimeout(timer)
  }, [count])

  const arrived = stream.slice(0, count)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSiemOn((value) => !value)}
          aria-pressed={siemOn}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            siemOn
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          {siemOn ? 'SIEM is on' : 'Turn the SIEM on'}
        </button>
        <button
          type="button"
          onClick={() => setCount(0)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Replay the logs
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Places you have to watch:{' '}
          <span
            className={`font-mono font-bold ${
              siemOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {siemOn ? 1 : hosts.length}
          </span>
        </span>
      </div>

      <div className={`grid gap-3 ${siemOn ? 'lg:grid-cols-[1fr_1.1fr]' : ''}`}>
        {/* the machines, each in its own dialect */}
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {hosts.map((host) => {
            const lines = arrived.filter((event) => event.host === host.id)
            return (
              <div
                key={host.id}
                className="min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                    {host.label}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {host.kind}
                  </span>
                </p>
                <div className="mt-1.5 h-16 overflow-hidden rounded bg-slate-950 p-1.5">
                  <AnimatePresence initial={false}>
                    {lines.slice(-2).map((line, index) => (
                      <motion.p
                        key={`${line.host}-${line.normal.time}-${index}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="truncate font-mono text-[9px] leading-relaxed text-emerald-400"
                      >
                        {line.raw}
                      </motion.p>
                    ))}
                  </AnimatePresence>
                  {lines.length === 0 ? (
                    <p className="font-mono text-[9px] text-slate-600">waiting…</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {/* the same events, gathered and rewritten */}
        <AnimatePresence>
          {siemOn ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="min-w-0 rounded-lg border-2 border-sky-400 bg-white p-3 dark:border-sky-600 dark:bg-slate-950"
            >
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                One place, one language
              </p>
              <table className="mt-2 w-full text-left font-mono text-[10px]">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-500">
                    <th className="font-normal">time</th>
                    <th className="font-normal">user</th>
                    <th className="font-normal">src_ip</th>
                    <th className="font-normal">action</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {arrived.map((event, index) => (
                      <motion.tr
                        key={`${event.host}-${index}`}
                        initial={{ opacity: 0, backgroundColor: 'rgba(56,189,248,0.25)' }}
                        animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                        transition={{ duration: 0.8 }}
                        className="text-slate-700 dark:text-slate-200"
                      >
                        <td>{event.normal.time}</td>
                        <td>{event.normal.user}</td>
                        <td>{event.normal.src}</td>
                        <td className="text-rose-600 dark:text-rose-400">
                          {event.normal.action}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {arrived.length >= 4 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 rounded border border-rose-300 bg-rose-50 p-2 text-[10px] leading-relaxed text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                >
                  Same account, same source address, failing on three different systems.
                  Nobody staring at one machine would have seen that.
                </motion.p>
              ) : null}
            </motion.div>
          ) : (
            <motion.p
              key="off"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg border border-dashed border-slate-300 p-3 text-xs leading-relaxed text-slate-500 lg:col-span-1 dark:border-slate-700 dark:text-slate-400"
            >
              Three machines, three formats. The same account is being attacked on all
              three right now — but the evidence is split across three screens in three
              different dialects, and nothing is comparing them.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
