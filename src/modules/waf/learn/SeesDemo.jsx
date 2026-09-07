import { useState } from 'react'
import { motion } from 'framer-motion'
import { evaluate } from '../lib/engine.js'
import { getRequest } from '../data/requests.js'

const pair = [
  { id: 'support-ticket', who: 'A customer', tone: 'emerald' },
  { id: 'obvious-attack', who: 'An attacker', tone: 'rose' },
]

/** Lesson 1: the same connection, judged at two different layers. */
export default function SeesDemo() {
  const [id, setId] = useState('obvious-attack')
  const request = getRequest(id)
  const isAttack = request.intent === 'attack'
  const wafResult = evaluate(request, { paranoiaLevel: 1 })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {pair.map((option) => {
          const selected = option.id === id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setId(option.id)}
              aria-pressed={selected}
              className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors sm:flex-none ${
                selected
                  ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950'
                  : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950'
              }`}
            >
              <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                {option.who} arrives
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                {getRequest(option.id).method} {getRequest(option.id).path}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* layer 3/4 */}
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-50">
            What the network firewall sees
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Layer 3/4 — addresses and ports
          </p>
          <dl className="mt-2.5 space-y-1 font-mono text-[11px]">
            {[
              ['source', '203.0.113.47'],
              ['destination', '198.51.100.10'],
              ['port', '443/tcp'],
              ['state', 'NEW'],
              ['tls', 'valid'],
            ].map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <dt className="w-16 shrink-0 text-slate-500 sm:w-24 dark:text-slate-500">{key}</dt>
                <dd className="text-slate-800 dark:text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 rounded bg-emerald-100 px-2 py-1.5 text-center text-[11px] font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            ALLOW — port 443 is open to everyone
          </p>
          <p className="mt-2 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
            Identical for both visitors. There is no field here that could have told them
            apart.
          </p>
        </div>

        {/* layer 7 */}
        <div className="rounded-lg border-2 border-sky-400 bg-white p-3 dark:border-sky-600 dark:bg-slate-950">
          <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-50">
            What the WAF sees
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Layer 7 — the HTTP request itself
          </p>
          <dl className="mt-2.5 space-y-1 font-mono text-[11px]">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-slate-500 sm:w-24 dark:text-slate-500">method</dt>
              <dd className="text-slate-800 dark:text-slate-200">{request.method}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-slate-500 sm:w-24 dark:text-slate-500">path</dt>
              <dd className="text-slate-800 dark:text-slate-200">{request.path}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-slate-500 sm:w-24 dark:text-slate-500">user-agent</dt>
              <dd className="truncate text-slate-800 dark:text-slate-200">
                {request.headers['User-Agent'].slice(0, 34)}…
              </dd>
            </div>
            {Object.entries(request.args).map(([name, value]) => (
              <div key={name} className="flex gap-2">
                <dt className="w-16 shrink-0 text-slate-500 sm:w-24 dark:text-slate-500">{name}</dt>
                <dd
                  className={`break-all ${
                    isAttack
                      ? 'rounded bg-rose-100 px-1 font-semibold text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {String(value).slice(0, 70)}
                </dd>
              </div>
            ))}
          </dl>
          <motion.p
            key={id}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mt-3 rounded px-2 py-1.5 text-center text-[11px] font-bold ${
              wafResult.blocked
                ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
          >
            {wafResult.blocked ? 'BLOCK — anomaly score ' + wafResult.score : 'ALLOW'}
          </motion.p>
          <p className="mt-2 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
            {wafResult.blocked
              ? 'The parameter contents were the deciding evidence — nothing at the network layer differed.'
              : 'Same connection, same port, and this time the contents are ordinary.'}
          </p>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Switch between the two visitors and watch the left panel. It does not change —
        because at that layer, nothing about them is different. Every argument for owning a
        WAF is contained in that non-difference.
      </p>
    </div>
  )
}
