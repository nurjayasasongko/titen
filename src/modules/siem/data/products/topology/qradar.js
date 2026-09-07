/**
 * QRadar's pipeline, running.
 *
 * Two things happen here that do not happen in the other two products, and
 * both are visible rather than described: the Event Collector throttles on
 * the EPS licence and drops what it cannot take, and it coalesces identical
 * events so fewer records leave than arrived.
 */
const EPS_LICENCE = 14
const THRESHOLD = 8

export default {
  id: 'qradar',
  label: 'QRadar event pipeline, live',
  viewBox: { width: 1080, height: 344 },
  decorations: [{ x: 208, y1: 40, y2: 178 }],
  kinds: {
    raw: { label: 'raw event', fill: '#94a3b8', size: 5 },
    normalised: { label: 'normalised (QID assigned)', fill: '#0ea5e9', size: 5 },
    suspicious: { label: '4625 failed logon', fill: '#f59e0b', size: 5.5 },
    coalesced: { label: 'coalesced record', fill: '#8b5cf6', size: 7.5 },
    offense: { label: 'offense', fill: '#f43f5e', size: 9, shape: 'diamond' },
  },
  nodes: [
    { id: 'win', kind: 'source', label: 'Windows', sub: 'WinCollect', x: 16, y: 16, w: 150, h: 48 },
    { id: 'lin', kind: 'source', label: 'Linux', sub: 'syslog', x: 16, y: 76, w: 150, h: 48 },
    { id: 'fw', kind: 'source', label: 'Firewall', sub: 'syslog', x: 16, y: 136, w: 150, h: 48 },
    { id: 'ec', detail: 'event-collector', kind: 'process', label: 'Event Collector', sub: 'ecs-ec-ingress → ecs-ec', x: 248, y: 60, w: 176, h: 104 },
    { id: 'ep', detail: 'event-processor', kind: 'process', label: 'Event Processor', sub: 'ecs-ep · Custom Rules Engine', x: 468, y: 60, w: 176, h: 104 },
    { id: 'ariel', detail: 'ariel', kind: 'sink', label: 'Ariel', sub: '/store/ariel', x: 468, y: 236, w: 176, h: 62 },
    { id: 'mag', detail: 'magistrate', kind: 'process', label: 'Magistrate', sub: 'MPC · Console only', x: 688, y: 60, w: 166, h: 104 },
    { id: 'offenses', detail: 'offenses-ui', kind: 'sink', tone: 'alert', label: 'Offenses tab', sub: 'ranked by magnitude', x: 898, y: 60, w: 166, h: 104 },
  ],
  links: [
    { id: 'win-ec', from: 'win', to: 'ec', bus: 208, carries: 'raw' },
    { id: 'lin-ec', from: 'lin', to: 'ec', bus: 208, carries: 'raw' },
    { id: 'fw-ec', from: 'fw', to: 'ec', bus: 208, carries: 'raw' },
    { id: 'ec-ep', from: 'ec', to: 'ep', carries: 'normalised' },
    { id: 'ep-ariel', from: 'ep', to: 'ariel', down: true, carries: 'normalised' },
    { id: 'ep-mag', from: 'ep', to: 'mag', carries: 'alert' },
    { id: 'mag-offenses', from: 'mag', to: 'offenses', carries: 'alert' },
  ],
  emitters: [
    { link: 'win-ec', every: 520, kind: () => (Math.random() < 0.08 ? 'suspicious' : 'raw') },
    { link: 'lin-ec', every: 640, kind: 'raw' },
    { link: 'fw-ec', every: 400, kind: 'raw' },
  ],
  initialState: () => ({
    eps: 0,
    epsCount: 0,
    epsAcc: 0,
    dropped: 0,
    coalesced: 0,
    coalesceBuf: 0,
    stored: 0,
    window: 0,
    offenseId: null,
    offenseEvents: 0,
    offenses: 0,
  }),
  onEmit: (_emitter, api) => {
    api.state.epsCount += 1
  },
  onTick: (dt, api) => {
    const state = api.state
    state.epsAcc += dt
    if (state.epsAcc >= 1000) {
      state.eps = state.epsCount
      state.epsCount = 0
      state.epsAcc = 0
    }
  },
  arrive: (nodeId, packet, api) => {
    const state = api.state
    if (nodeId === 'ec') {
      // license throttling: past the EPS licence the queue fills and events go
      if (state.eps > EPS_LICENCE) {
        state.dropped += 1
        return
      }
      // coalescing: identical events inside the window collapse into one record
      if (packet.kind === 'raw' && Math.random() < 0.45) {
        state.coalesceBuf += 1
        state.coalesced += 1
        if (state.coalesceBuf >= 3) {
          state.coalesceBuf = 0
          api.spawn('ec-ep', 'coalesced')
        }
        return
      }
      api.spawn('ec-ep', packet.kind === 'suspicious' ? 'suspicious' : 'normalised')
      return
    }
    if (nodeId === 'ep') {
      api.spawn('ep-ariel', 'normalised')
      if (packet.kind === 'suspicious') {
        state.window += 1
        if (state.window >= THRESHOLD) {
          state.window = 0
          api.spawn('ep-mag', 'offense')
        }
      }
      return
    }
    if (nodeId === 'ariel') {
      state.stored += 1
      return
    }
    if (nodeId === 'mag') {
      // the Magistrate attaches to the open offense for this username rather
      // than opening a second one
      if (state.offenseId === null) {
        state.offenseId = 4471
        state.offenses += 1
      }
      state.offenseEvents += THRESHOLD
      api.spawn('mag-offenses', 'offense')
    }
  },
  overlays: [
    {
      node: 'ec',
      type: 'bar',
      label: (s) => `EPS ${s.eps} / ${EPS_LICENCE} licensed`,
      value: (s) => s.eps / EPS_LICENCE,
      alert: (s) => s.eps > EPS_LICENCE,
    },
    { node: 'ec', type: 'mono', value: (s) => `coalesced ${s.coalesced} · dropped ${s.dropped}`, tone: (s) => (s.dropped ? 'bad' : 'plain') },
    {
      node: 'ep',
      type: 'bar',
      label: (s) => `CRE: ${s.window} / ${THRESHOLD} failures`,
      value: (s) => s.window / THRESHOLD,
      alert: (s) => s.window >= THRESHOLD - 1,
    },
    { node: 'ariel', type: 'mono', tone: 'good', value: (s) => `${s.stored.toLocaleString()} events` },
    {
      node: 'mag',
      type: 'mono',
      value: (s) =>
        s.offenseId ? `offense ${s.offenseId} · ${s.offenseEvents} events` : 'no open offense',
    },
    { node: 'offenses', type: 'big', value: (s) => s.offenses, suffix: 'offense open' },
  ],
  stats: [
    { label: 'EPS right now', value: (s) => s.eps, tone: 'plain' },
    { label: 'dropped over licence', value: (s) => s.dropped, tone: 'bad' },
    { label: 'offenses opened', value: (s) => s.offenses, tone: 'bad' },
  ],
  actions: [
    {
      label: 'Flood it past the EPS licence',
      run: (api) => {
        for (let i = 0; i < 40; i += 1) api.spawn('fw-ec', 'raw')
        api.state.epsCount += 40
      },
    },
  ],
  dockProgress: (s) => `${s.eps} EPS · ${s.offenses} offenses`,
}
