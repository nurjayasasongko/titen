import { useEffect, useMemo, useRef, useState } from 'react'
import PlaybackDock from '../PlaybackDock.jsx'
import { measure, pathOf, pointAt, routeOf } from '../../lib/flow.js'

const FRAME_MS = 40
const TRAVEL_MS = 1500

/**
 * Spawn a packet, threading the trace and origin. Shared by the animation
 * loop and the action buttons so a burst-spawned packet is a first-class
 * packet you can follow, not an untraced one.
 */
function pushPacket(engine, spec, linkId, kind, extra = {}) {
  const link = spec.links.find((item) => item.id === linkId)
  let trace = extra.trace
  if (trace === undefined) {
    trace =
      engine.arriving && engine.spawnedThisArrive === 0
        ? engine.arriving.trace
        : engine.traceSeq++
  }
  engine.spawnedThisArrive += 1
  const origin = extra.origin ?? engine.arriving?.origin ?? (link ? link.from : undefined)
  const packet = { id: engine.nextId++, linkId, t: 0, kind, ...extra, trace, origin }
  engine.packets.push(packet)
  return packet
}

/**
 * A live topology: boxes wired together, with packets actually travelling
 * the wires and being transformed, merged or dropped by whatever they
 * arrive at.
 *
 * The scene itself is generic. Everything that makes one product's pipeline
 * behave differently from another's lives in the `spec`:
 *
 *   emitters   who produces traffic, and how fast
 *   arrive     what a box does with a packet that reaches it
 *   overlays   the live numbers drawn inside a box
 *   stats      the summary row underneath
 *
 * That is deliberate: the interesting part of each SIEM is what its boxes
 * do to the traffic, so that is the part each product supplies.
 */
export default function TopologyScene({
  spec,
  selectedNodeId = null,
  onSelectNode = null,
  footnote = null,
  autoStart = true,
}) {
  const nodeById = useMemo(
    () => Object.fromEntries(spec.nodes.map((node) => [node.id, node])),
    [spec],
  )

  const routes = useMemo(() => {
    const built = {}
    for (const link of spec.links) {
      built[link.id] = measure(
        routeOf(nodeById[link.from], nodeById[link.to], {
          bus: link.bus,
          down: link.down,
        }),
      )
    }
    return built
  }, [spec, nodeById])

  const [isPlaying, setIsPlaying] = useState(autoStart)
  const [speed, setSpeed] = useState(1)
  const [frame, setFrame] = useState({ packets: [], active: {} })
  const [snapshot, setSnapshot] = useState(() => spec.initialState())
  // the packet the viewer has pinned to follow, and its running history
  const [followTrace, setFollowTrace] = useState(null)
  const [followData, setFollowData] = useState(null)
  const controlsRef = useRef(null)

  const world = useRef(null)

  function freshWorld() {
    return {
      specId: spec.id,
      packets: [],
      nextId: 1,
      traceSeq: 1,
      // a trace follows one logical event across the boxes, even though each
      // box consumes the arriving packet and spawns a new one downstream
      traces: new Map(),
      arriving: null,
      spawnedThisArrive: 0,
      emitAcc: {},
      timerAcc: {},
      active: {},
      state: spec.initialState(),
    }
  }

  useEffect(() => {
    // built here rather than during render: the simulation is external state
    if (!world.current || world.current.specId !== spec.id) {
      world.current = freshWorld()
    }
    if (!isPlaying) return
    let raf = 0
    let last = performance.now()
    let sinceRender = 0

    const tick = (now) => {
      const dt = Math.min(now - last, 120) * speed
      last = now
      const engine = world.current
      // the first packet spawned while handling an arrival continues the same
      // trace; extra ones (a copy to storage, say) branch off as their own, so
      // "follow this packet" stays a single thread
      const api = {
        state: engine.state,
        spawn: (linkId, kind, extra = {}) => pushPacket(engine, spec, linkId, kind, extra),
      }

      // append one entry to a trace's history — the same arrival events that
      // recolour the dots, reused to build the inspector timeline
      const record = (packet, nodeId) => {
        let history = engine.traces.get(packet.trace)
        if (!history) {
          history = { trace: packet.trace, origin: packet.origin, stages: [] }
          engine.traces.set(packet.trace, history)
          if (engine.traces.size > 260) {
            engine.traces.delete(engine.traces.keys().next().value)
          }
        }
        history.stages.push({
          nodeId,
          kind: packet.kind,
          body: spec.inspect ? spec.inspect(nodeId, packet, engine.state) : null,
        })
      }

      // sources keep producing, whatever happens downstream
      for (const emitter of spec.emitters) {
        const every = emitter.every
        engine.emitAcc[emitter.link] = (engine.emitAcc[emitter.link] ?? 0) + dt
        while (engine.emitAcc[emitter.link] > every) {
          engine.emitAcc[emitter.link] -= every
          const kind =
            typeof emitter.kind === 'function' ? emitter.kind(engine.state) : emitter.kind
          api.spawn(emitter.link, kind)
          spec.onEmit?.(emitter, api)
        }
      }

      // scheduled work — the thing that separates a streaming engine from a
      // search that only runs when its timer says so
      for (const timer of spec.timers ?? []) {
        engine.timerAcc[timer.id] = (engine.timerAcc[timer.id] ?? 0) + dt
        if (engine.timerAcc[timer.id] >= timer.every) {
          engine.timerAcc[timer.id] = 0
          timer.run(api)
        }
        engine.state[`${timer.id}_progress`] = engine.timerAcc[timer.id] / timer.every
      }

      spec.onTick?.(dt, api)

      const survivors = []
      for (const packet of engine.packets) {
        packet.t += dt / (packet.travel ?? TRAVEL_MS)
        if (packet.t < 1) {
          survivors.push(packet)
          continue
        }
        const link = spec.links.find((item) => item.id === packet.linkId)
        engine.active[link.to] = now
        engine.arriving = packet
        engine.spawnedThisArrive = 0
        spec.arrive(link.to, packet, api, link)
        record(packet, link.to)
        engine.arriving = null
      }
      engine.packets = survivors

      sinceRender += dt
      if (sinceRender >= FRAME_MS) {
        sinceRender = 0
        setFrame({
          packets: engine.packets.map((packet) => ({
            id: packet.id,
            kind: packet.kind,
            trace: packet.trace,
            ...pointAt(routes[packet.linkId], packet.t),
          })),
          active: Object.fromEntries(
            Object.entries(engine.active).map(([id, at]) => [id, now - at < 320]),
          ),
        })
        setSnapshot({ ...engine.state })
        if (engine.followTrace != null) {
          const history = engine.traces.get(engine.followTrace)
          setFollowData(history ? { ...history, stages: [...history.stages] } : null)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speed, routes, spec])

  // keep the loop's copy of "what am I following" in step with React state
  useEffect(() => {
    if (world.current) world.current.followTrace = followTrace
  }, [followTrace])

  function reset() {
    if (!world.current) return
    world.current = freshWorld()
    clearFollow()
    setSnapshot(spec.initialState())
    setFrame({ packets: [], active: {} })
  }

  function clearFollow() {
    setFollowTrace(null)
    setFollowData(null)
    if (world.current) world.current.followTrace = null
  }

  // click a moving packet: pin it, pause so it can be read, and pull its
  // history so far. Clicking the pinned packet again resumes.
  function onPacketClick(packet) {
    if (packet.trace === followTrace && !isPlaying) {
      setIsPlaying(true)
      return
    }
    setFollowTrace(packet.trace)
    if (world.current) {
      world.current.followTrace = packet.trace
      const history = world.current.traces.get(packet.trace)
      setFollowData(history ? { ...history, stages: [...history.stages] } : null)
    }
    setIsPlaying(false)
  }

  const followInFlight = frame.packets.some((packet) => packet.trace === followTrace)

  const overlaysByNode = useMemo(() => {
    const grouped = {}
    for (const overlay of spec.overlays ?? []) {
      grouped[overlay.node] = [...(grouped[overlay.node] ?? []), overlay]
    }
    return grouped
  }, [spec])

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <svg
          viewBox={`0 0 ${spec.viewBox.width} ${spec.viewBox.height}`}
          className="h-auto w-full min-w-[46rem]"
          role="img"
          aria-label={spec.label}
        >
          {(spec.decorations ?? []).map((decoration, index) =>
            decoration.type === 'region' ? (
              <g key={index}>
                <rect
                  x={decoration.x}
                  y={decoration.y}
                  width={decoration.w}
                  height={decoration.h}
                  rx="10"
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                  className="fill-slate-100/70 stroke-slate-400 dark:fill-slate-900/50 dark:stroke-slate-600"
                />
                <text
                  x={decoration.x + 10}
                  y={decoration.y + 16}
                  className="fill-slate-500 text-[10px] font-semibold dark:fill-slate-400"
                >
                  {decoration.label}
                </text>
              </g>
            ) : (
            <g key={index}>
              <line
                x1={decoration.x}
                y1={decoration.y1}
                x2={decoration.x}
                y2={decoration.y2}
                strokeWidth="2"
                strokeDasharray={decoration.dashed ? '7 6' : undefined}
                className={
                  decoration.dashed
                    ? 'stroke-emerald-400 dark:stroke-emerald-700'
                    : 'stroke-slate-300 dark:stroke-slate-700'
                }
              />
              {decoration.label ? (
                <text
                  x={decoration.x + 6}
                  y={decoration.y1 - 6}
                  className="fill-emerald-600 text-[10px] font-semibold dark:fill-emerald-400"
                >
                  {decoration.label}
                </text>
              ) : null}
            </g>
            ),
          )}

          {spec.links.map((link) => (
            <path
              key={link.id}
              d={pathOf(routes[link.id])}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={link.dashed ? '6 5' : undefined}
              className={
                link.carries === 'alert'
                  ? 'stroke-rose-300 dark:stroke-rose-800'
                  : 'stroke-slate-300 dark:stroke-slate-700'
              }
            />
          ))}

          {spec.nodes.map((node) => {
            const live = Boolean(frame.active[node.id])
            const selected = node.id === selectedNodeId
            const clickable = Boolean(onSelectNode) && node.kind !== 'source'
            return (
              <g
                key={node.id}
                onClick={clickable ? () => onSelectNode(node.id) : undefined}
                className={clickable ? 'cursor-pointer' : undefined}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx="8"
                  strokeWidth={selected ? 3 : live ? 2.5 : 1.5}
                  className={`fill-white transition-all dark:fill-slate-950 ${
                    selected
                      ? 'stroke-sky-500'
                      : node.tone === 'alert'
                        ? 'stroke-rose-400 dark:stroke-rose-700'
                        : live
                          ? 'stroke-sky-500'
                          : 'stroke-slate-300 dark:stroke-slate-700'
                  }`}
                />
                <text
                  x={node.x + 10}
                  y={node.y + 20}
                  className="fill-slate-900 text-[13px] font-semibold dark:fill-slate-50"
                >
                  {node.label}
                </text>
                <text
                  x={node.x + 10}
                  y={node.y + 34}
                  className="fill-slate-500 font-mono text-[9.5px] dark:fill-slate-400"
                >
                  {node.sub}
                </text>

                {(overlaysByNode[node.id] ?? []).map((overlay, index) => {
                  const top = node.y + 48 + index * 20
                  if (overlay.type === 'bar') {
                    const value = Math.min(1, Math.max(0, overlay.value(snapshot)))
                    return (
                      <g key={index}>
                        <text
                          x={node.x + 10}
                          y={top}
                          className="fill-slate-500 font-mono text-[9.5px] dark:fill-slate-400"
                        >
                          {overlay.label(snapshot)}
                        </text>
                        <rect
                          x={node.x + 10}
                          y={top + 5}
                          width={node.w - 20}
                          height="5"
                          rx="2.5"
                          className="fill-slate-200 dark:fill-slate-800"
                        />
                        <rect
                          x={node.x + 10}
                          y={top + 5}
                          width={(node.w - 20) * value}
                          height="5"
                          rx="2.5"
                          className={
                            overlay.alert?.(snapshot) ? 'fill-rose-500' : 'fill-sky-500'
                          }
                        />
                      </g>
                    )
                  }
                  if (overlay.type === 'big') {
                    return (
                      <text
                        key={index}
                        x={node.x + 10}
                        y={top + 10}
                        className="fill-rose-600 text-[19px] font-bold dark:fill-rose-400"
                      >
                        {overlay.value(snapshot)}
                        <tspan className="fill-slate-500 text-[9.5px] font-normal dark:fill-slate-400">
                          {' '}
                          {overlay.suffix}
                        </tspan>
                      </text>
                    )
                  }
                  if (overlay.type === 'lights') {
                    const lit = overlay.value(snapshot)
                    return (
                      <g key={index}>
                        {overlay.items.map((item, itemIndex) => (
                          <g key={item}>
                            <rect
                              x={node.x + 10 + itemIndex * 30}
                              y={top}
                              width="26"
                              height="5"
                              rx="2.5"
                              className={
                                itemIndex === lit
                                  ? 'fill-sky-500'
                                  : 'fill-slate-200 dark:fill-slate-800'
                              }
                            />
                            <text
                              x={node.x + 10 + itemIndex * 30}
                              y={top + 15}
                              className="fill-slate-400 font-mono text-[7px] dark:fill-slate-500"
                            >
                              {item}
                            </text>
                          </g>
                        ))}
                      </g>
                    )
                  }
                  return (
                    <text
                      key={index}
                      x={node.x + 10}
                      y={top}
                      className={`font-mono text-[10px] font-bold ${
                        overlay.tone === 'good'
                          ? 'fill-emerald-600 dark:fill-emerald-400'
                          : overlay.tone === 'bad'
                            ? 'fill-rose-600 dark:fill-rose-400'
                            : 'fill-slate-600 dark:fill-slate-300'
                      }`}
                    >
                      {overlay.value(snapshot)}
                    </text>
                  )
                })}
              </g>
            )
          })}

          {frame.packets.map((packet) => {
            const style = spec.kinds[packet.kind]
            if (!style) return null
            const followed = followTrace != null && packet.trace === followTrace
            const dimmed = followTrace != null && followInFlight && !followed
            const r = style.size / 2
            return (
              <g
                key={packet.id}
                opacity={dimmed ? 0.16 : 1}
                onClick={(event) => {
                  event.stopPropagation()
                  onPacketClick(packet)
                }}
                className="cursor-pointer"
              >
                {/* halo on the pinned packet so it stands out of the crowd */}
                {followed ? (
                  <circle cx={packet.x} cy={packet.y} r={r + 6} className="fill-sky-400/30">
                    <animate attributeName="r" values={`${r + 4};${r + 8};${r + 4}`} dur="1.1s" repeatCount="indefinite" />
                  </circle>
                ) : null}
                {/* generous invisible hit area — the dots are tiny */}
                <circle cx={packet.x} cy={packet.y} r={Math.max(r + 7, 11)} fill="transparent" />
                {style.shape === 'diamond' ? (
                  <rect
                    x={packet.x - r}
                    y={packet.y - r}
                    width={style.size}
                    height={style.size}
                    fill={style.fill}
                    stroke={followed ? '#0284c7' : 'none'}
                    strokeWidth={followed ? 2 : 0}
                    transform={`rotate(45 ${packet.x} ${packet.y})`}
                  />
                ) : (
                  <circle
                    cx={packet.x}
                    cy={packet.y}
                    r={followed ? r + 1.5 : r}
                    fill={style.fill}
                    stroke={followed ? '#0284c7' : 'none'}
                    strokeWidth={followed ? 2 : 0}
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {followData ? (
        <PacketInspector
          data={followData}
          nodeById={nodeById}
          kinds={spec.kinds}
          inFlight={followInFlight}
          onClose={clearFollow}
        />
      ) : (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Tip: click any moving packet to pin it — the simulation pauses and an inspector
          follows that one packet as it crosses each stage.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {spec.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-[10px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {stat.label}
            </p>
            <p
              className={`font-mono text-lg font-bold tabular-nums ${
                stat.tone === 'good'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : stat.tone === 'bad'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-slate-50'
              }`}
            >
              {stat.value(snapshot)}
            </p>
          </div>
        ))}
      </div>

      <div ref={controlsRef} className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPlaying((value) => !value)}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
        >
          {isPlaying ? 'Pause' : 'Resume'}
        </button>
        {spec.actions?.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              const engine = world.current
              if (!engine) return
              const spawned = []
              action.run({
                state: engine.state,
                spawn: (linkId, kind, extra = {}) =>
                  spawned.push(pushPacket(engine, spec, linkId, kind, extra)),
              })
              // if the action asks, auto-pin one of the packets it just
              // launched, so the inspector appears without hunting for a dot
              if (action.follow && spec.inspect && spawned.length) {
                const target =
                  spawned.find((packet) => packet.kind === action.follow) ?? spawned[0]
                setFollowTrace(target.trace)
                engine.followTrace = target.trace
                setFollowData({ trace: target.trace, origin: target.origin, stages: [] })
              }
              setIsPlaying(true)
            }}
            className="rounded-lg border border-rose-400 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 transition-colors hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Reset
        </button>
        <div className="flex gap-1">
          {[0.5, 1, 2].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeed(value)}
              aria-pressed={speed === value}
              className={`rounded-md px-2 py-1.5 font-mono text-[11px] transition-colors ${
                speed === value
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
        <span className="font-medium text-slate-500 dark:text-slate-500">On the wire:</span>
        {Object.entries(spec.kinds).map(([kind, style]) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: style.fill }}
            />
            {style.label}
          </span>
        ))}
      </div>

      {footnote ? (
        <p className="border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {footnote}
        </p>
      ) : null}

      <PlaybackDock
        anchorRef={controlsRef}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((value) => !value)}
        label={spec.label}
        progress={spec.dockProgress?.(snapshot) ?? null}
      />
    </div>
  )
}

const stageTone = {
  raw: 'border-slate-300 dark:border-slate-600',
  parsed: 'border-sky-400 dark:border-sky-600',
  suspicious: 'border-amber-400 dark:border-amber-600',
  alert: 'border-rose-400 dark:border-rose-600',
}

/**
 * The inspector: a panel pinned to one packet, rebuilt from the trace's
 * history so it survives the packet being consumed and respawned at each box.
 * Each entry is one arrival event — the same signal that recolours the dots.
 */
function PacketInspector({ data, nodeById, kinds, inFlight, onClose }) {
  const stages = data.stages ?? []
  const last = stages[stages.length - 1]
  return (
    <div className="rounded-lg border-2 border-sky-400 bg-white dark:border-sky-600 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex size-2.5 items-center justify-center">
            <span className="size-2.5 rounded-full bg-sky-500" />
          </span>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
            Following packet #{data.trace}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {inFlight ? 'in flight — Resume to keep following' : 'this packet has been consumed; its trail is below'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          ✕ unpin
        </button>
      </div>

      <ol className="max-h-64 space-y-0 overflow-y-auto p-2">
        {stages.map((stage, index) => {
          const node = nodeById[stage.nodeId]
          const kind = kinds[stage.kind]
          const isLast = index === stages.length - 1
          return (
            <li key={index} className="flex gap-2.5 px-1">
              {/* the rail */}
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 size-2.5 rounded-full ${isLast ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-slate-950' : ''}`}
                  style={{ backgroundColor: kind?.fill ?? '#94a3b8' }}
                />
                {index < stages.length - 1 ? (
                  <span className="my-0.5 w-px flex-1 bg-slate-200 dark:bg-slate-700" />
                ) : null}
              </div>
              {/* the entry */}
              <div className={`mb-2 min-w-0 flex-1 rounded-lg border bg-slate-50 p-2 dark:bg-slate-900 ${stageTone[stage.kind] ?? 'border-slate-200 dark:border-slate-800'}`}>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900 dark:text-slate-50">
                  {node?.label ?? stage.nodeId}
                  {kind ? (
                    <span className="rounded px-1 py-0.5 text-[9px] font-medium" style={{ backgroundColor: (kind.fill ?? '#94a3b8') + '22', color: kind.fill }}>
                      {kind.label}
                    </span>
                  ) : null}
                </p>
                <InspectorBody body={stage.body} />
              </div>
            </li>
          )
        })}
        {stages.length === 0 ? (
          <li className="p-2 text-[11px] text-slate-500 dark:text-slate-400">
            No stages recorded yet — Resume and this fills in as the packet crosses each box.
          </li>
        ) : null}
      </ol>

      {last?.body?.footer ? (
        <p className="border-t border-slate-200 px-3 py-2 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {last.body.footer}
        </p>
      ) : null}
    </div>
  )
}

function InspectorBody({ body }) {
  if (!body) return null
  if (body.type === 'raw') {
    return (
      <pre className="mt-1 overflow-x-auto rounded bg-slate-950 p-2 font-mono text-[10px] leading-relaxed text-emerald-300">
        {body.text}
      </pre>
    )
  }
  if (body.type === 'fields') {
    return (
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-[10px]">
        {body.pairs.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-slate-500 dark:text-slate-400">{key}</dt>
            <dd className="truncate text-slate-800 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    )
  }
  if (body.type === 'note') {
    return (
      <p
        className={`mt-1 text-[11px] leading-snug ${
          body.tone === 'alert'
            ? 'font-medium text-rose-700 dark:text-rose-300'
            : body.tone === 'good'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-700 dark:text-slate-300'
        }`}
      >
        {body.text}
      </p>
    )
  }
  return null
}
