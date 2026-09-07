import { useEffect, useRef, useState } from 'react'

// four stops, matching the finalised mockup's coordinates and colours
const stops = [20, 110, 200, 290]
const colors = ['#7a86a3', '#4d8dff', '#f5a623', '#ef4462']
const labels = ['source', 'parser', 'correlate', 'alert']

/**
 * The hero's live miniature of the log pipeline: a packet steps through
 * source → parser → correlate → alert, colouring itself at each stop. Every
 * full lap counts one "event seen"; every fourth lap interrupts a human.
 * Decorative — a straight port of the mockup, not the real visualiser.
 */
export default function HeroPipeline() {
  const [i, setI] = useState(0)
  const [seen, setSeen] = useState(0)
  const [alerted, setAlerted] = useState(0)
  const [t, setT] = useState(0)
  const state = useRef({ i: 0, seen: 0, alerted: 0, t: 0 })

  useEffect(() => {
    const timer = setInterval(() => {
      const s = state.current
      setI(s.i)
      if (s.i === 0 && s.t > 0) {
        s.seen += 1
        if (s.seen % 4 === 0) s.alerted += 1
        setSeen(s.seen)
        setAlerted(s.alerted)
      }
      s.t += 0.6
      setT(s.t)
      s.i = (s.i + 1) % stops.length
    }, 600)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="surface rounded-[10px] p-5">
      <div className="mb-3.5 flex justify-between font-mono text-[11px] text-[color:var(--text-dim)]">
        <span>live_trace.svg</span>
        <span className="tabular-nums">{t.toFixed(1)}s</span>
      </div>

      <svg viewBox="0 0 340 90" className="h-[90px] w-full">
        <line x1="20" y1="45" x2="320" y2="45" stroke="var(--border)" strokeWidth="1" />
        {stops.map((x, index) => (
          <g key={x}>
            <circle
              cx={x}
              cy="45"
              r="4"
              fill={index <= i ? colors[index] : 'var(--text-dim)'}
              opacity={index <= i ? 1 : 0.45}
            />
            <text
              x={x}
              y="70"
              textAnchor="middle"
              className="font-mono"
              style={{ fontSize: 9, fill: index === i ? colors[index] : 'var(--text-dim)' }}
            >
              {labels[index]}
            </text>
          </g>
        ))}
        <circle
          cx={stops[i]}
          cy="45"
          r="5"
          fill={colors[i]}
          style={{ transition: 'cx 0.4s ease, fill 0.4s ease', filter: `drop-shadow(0 0 6px ${colors[i]})` }}
        />
      </svg>

      <div
        className="mt-4 flex justify-between border-t pt-4 font-mono text-[12px] text-[color:var(--text-dim)]"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          events seen
          <span className="block text-[15px] tabular-nums" style={{ color: 'var(--green)' }}>
            {seen}
          </span>
        </div>
        <div className="text-right">
          humans interrupted
          <span className="block text-[15px] tabular-nums" style={{ color: 'var(--red)' }}>
            {alerted}
          </span>
        </div>
      </div>
    </div>
  )
}
