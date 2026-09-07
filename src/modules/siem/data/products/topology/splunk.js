/**
 * Splunk's pipeline, running.
 *
 * The two things worth watching are both absences. Events stay grey all the
 * way into storage — nothing is normalised on the way in, because Splunk
 * keeps the raw text. And the right-hand half of the diagram sits perfectly
 * still between scheduled runs, then moves in a burst. That stillness is
 * the detection latency you cannot configure away.
 */
const SEARCH_EVERY = 9000
const THRESHOLD = 8

export default {
  id: 'splunk',
  label: 'Splunk pipeline, live',
  viewBox: { width: 1080, height: 372 },
  decorations: [{ x: 196, y1: 44, y2: 150 }],
  kinds: {
    raw: { label: 'raw event (kept as text)', fill: '#94a3b8', size: 5 },
    extracted: { label: 'fields extracted at search time', fill: '#0ea5e9', size: 5 },
    suspicious: { label: 'failed login found by the search', fill: '#f59e0b', size: 5.5 },
    notable: { label: 'notable event', fill: '#f43f5e', size: 9, shape: 'diamond' },
  },
  nodes: [
    { id: 'win', kind: 'source', label: 'Windows', sub: 'universal forwarder', x: 16, y: 20, w: 152, h: 48 },
    { id: 'lin', kind: 'source', label: 'Linux', sub: 'universal forwarder', x: 16, y: 104, w: 152, h: 48 },
    { id: 'idx', detail: 'parsing', kind: 'process', label: 'Indexer', sub: 'splunkd', x: 236, y: 44, w: 178, h: 108 },
    { id: 'buckets', detail: 'buckets', kind: 'sink', label: 'Index buckets', sub: 'rawdata + tsidx', x: 236, y: 246, w: 178, h: 82 },
    { id: 'sh', detail: 'search', kind: 'process', label: 'Search head', sub: 'schema-on-read', x: 470, y: 44, w: 170, h: 108 },
    { id: 'es', detail: 'correlation', kind: 'process', label: 'Correlation search', sub: 'cron · every 5 min', x: 692, y: 44, w: 176, h: 108 },
    { id: 'notable', detail: 'incident-review', kind: 'sink', tone: 'alert', label: 'Incident Review', sub: 'notable events', x: 902, y: 44, w: 162, h: 108 },
  ],
  links: [
    { id: 'win-idx', from: 'win', to: 'idx', bus: 196, carries: 'raw' },
    { id: 'lin-idx', from: 'lin', to: 'idx', bus: 196, carries: 'raw' },
    { id: 'idx-buckets', from: 'idx', to: 'buckets', down: true, carries: 'raw' },
    { id: 'buckets-sh', from: 'buckets', to: 'sh', dashed: true, carries: 'raw' },
    { id: 'sh-es', from: 'sh', to: 'es', carries: 'raw' },
    { id: 'es-notable', from: 'es', to: 'notable', carries: 'alert' },
  ],
  emitters: [
    { link: 'win-idx', every: 500, kind: () => (Math.random() < 0.1 ? 'suspicious' : 'raw') },
    { link: 'lin-idx', every: 620, kind: 'raw' },
  ],
  initialState: () => ({
    indexed: 0,
    stored: 0,
    pending: 0,
    suspiciousInStore: 0,
    queue: 0,
    searches: 0,
    lastBatch: 0,
    esCount: 0,
    notables: 0,
    search_progress: 0,
  }),
  onTick: (dt, api) => {
    const state = api.state
    // the splunkd queue chain, cycling so it reads as a pipeline of stages
    state.queue = (state.queue + dt / 260) % 4
  },
  timers: [
    {
      id: 'search',
      every: SEARCH_EVERY,
      run: (api) => {
        const state = api.state
        state.searches += 1
        // the scheduled search reads what has accumulated since it last ran
        const batch = Math.min(state.pending, 8)
        state.pending -= batch
        state.lastBatch = batch
        for (let i = 0; i < batch; i += 1) api.spawn('buckets-sh', 'raw')
        const found = state.suspiciousInStore
        state.suspiciousInStore = 0
        for (let i = 0; i < found; i += 1) api.spawn('buckets-sh', 'suspicious')
      },
    },
  ],
  arrive: (nodeId, packet, api) => {
    const state = api.state
    if (nodeId === 'idx') {
      state.indexed += 1
      // no normalisation on the way in: what goes to disk is the raw text
      api.spawn('idx-buckets', packet.kind === 'suspicious' ? 'suspicious' : 'raw')
      return
    }
    if (nodeId === 'buckets') {
      state.stored += 1
      state.pending += 1
      if (packet.kind === 'suspicious') state.suspiciousInStore += 1
      return
    }
    if (nodeId === 'sh') {
      // extraction happens here, on every search, not once at ingest
      api.spawn('sh-es', packet.kind === 'suspicious' ? 'suspicious' : 'extracted')
      return
    }
    if (nodeId === 'es') {
      if (packet.kind === 'suspicious') {
        state.esCount += 1
        if (state.esCount >= THRESHOLD) {
          state.esCount = 0
          api.spawn('es-notable', 'notable')
        }
      }
      return
    }
    if (nodeId === 'notable') {
      state.notables += 1
    }
  },
  overlays: [
    {
      node: 'idx',
      type: 'lights',
      items: ['parse', 'agg', 'type', 'index'],
      value: (s) => Math.floor(s.queue),
    },
    { node: 'buckets', type: 'mono', tone: 'good', value: (s) => `${s.stored.toLocaleString()} raw events` },
    { node: 'buckets', type: 'mono', value: (s) => `${s.pending} not yet searched` },
    { node: 'sh', type: 'mono', value: () => 'fields exist only during a search' },
    {
      node: 'es',
      type: 'bar',
      label: (s) => `next run in ${Math.ceil((1 - (s.search_progress ?? 0)) * (SEARCH_EVERY / 1000))}s`,
      value: (s) => s.search_progress ?? 0,
    },
    { node: 'es', type: 'mono', value: (s) => `last run read ${s.lastBatch} events` },
    { node: 'notable', type: 'big', value: (s) => s.notables, suffix: 'notable' },
  ],
  stats: [
    { label: 'events stored raw', value: (s) => s.stored.toLocaleString(), tone: 'good' },
    { label: 'waiting for the next search', value: (s) => s.pending, tone: 'plain' },
    { label: 'notables raised', value: (s) => s.notables, tone: 'bad' },
  ],
  actions: [
    {
      label: 'Send a burst of failed logins',
      run: (api) => {
        for (let i = 0; i < 11; i += 1) api.spawn('win-idx', 'suspicious')
      },
    },
  ],
  dockProgress: (s) => `${s.pending} unsearched · ${s.notables} notables`,
}
