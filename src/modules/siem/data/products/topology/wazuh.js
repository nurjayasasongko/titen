/**
 * Wazuh's pipeline, running.
 *
 * Two things stand out once you watch it. Every event from every module is
 * funnelled through one process — wazuh-analysisd — so the queue in front of
 * it is a real bottleneck rather than a diagram detail. And an alert takes a
 * detour the other products do not have: it is written to a file first, and
 * only then tailed and shipped onward.
 */
const THRESHOLD = 8
const DRAIN_EVERY = 130
const QUEUE_CAP = 24

export default {
  id: 'wazuh',
  label: 'Wazuh pipeline, live',
  viewBox: { width: 1264, height: 300 },
  decorations: [{ x: 186, y1: 46, y2: 200 }],
  kinds: {
    raw: { label: 'event from an agent module', fill: '#94a3b8', size: 5 },
    suspicious: { label: 'Windows 4625', fill: '#f59e0b', size: 5.5 },
    alert: { label: 'alert (rule level ≥ 3)', fill: '#0ea5e9', size: 6 },
    composite: { label: 'composite alert (level 10)', fill: '#f43f5e', size: 9, shape: 'diamond' },
  },
  nodes: [
    { id: 'logcollector', kind: 'source', label: 'logcollector', sub: 'eventchannel · files', x: 16, y: 22, w: 152, h: 46 },
    { id: 'syscheck', kind: 'source', label: 'syscheckd', sub: 'file integrity', x: 16, y: 78, w: 152, h: 46 },
    { id: 'syscollector', kind: 'source', label: 'syscollector', sub: 'inventory', x: 16, y: 134, w: 152, h: 46 },
    { id: 'agentd', detail: 'agentd', kind: 'process', label: 'wazuh-agentd', sub: 'AES · 1514/tcp', x: 216, y: 56, w: 132, h: 92 },
    { id: 'remoted', detail: 'remoted', kind: 'process', label: 'wazuh-remoted', sub: 'decrypt · enqueue', x: 372, y: 56, w: 138, h: 92 },
    { id: 'analysisd', detail: 'analysisd', kind: 'process', label: 'wazuh-analysisd', sub: 'one process, four phases', x: 534, y: 40, w: 176, h: 124 },
    { id: 'alerts', detail: 'alerts', kind: 'sink', label: 'alerts.json', sub: '/var/ossec/logs', x: 734, y: 56, w: 132, h: 92 },
    { id: 'filebeat', detail: 'filebeat', kind: 'process', label: 'Filebeat', sub: 'tail · TLS 9200', x: 890, y: 56, w: 126, h: 92 },
    { id: 'indexer', detail: 'indexer', kind: 'process', label: 'Wazuh indexer', sub: 'wazuh-alerts-4.x', x: 1040, y: 56, w: 134, h: 92 },
    { id: 'dashboard', detail: 'dashboard', kind: 'sink', tone: 'alert', label: 'Dashboard', sub: 'Threat Hunting', x: 1040, y: 190, w: 134, h: 82 },
  ],
  links: [
    { id: 'logcollector-agentd', from: 'logcollector', to: 'agentd', bus: 186, carries: 'raw' },
    { id: 'syscheck-agentd', from: 'syscheck', to: 'agentd', bus: 186, carries: 'raw' },
    { id: 'syscollector-agentd', from: 'syscollector', to: 'agentd', bus: 186, carries: 'raw' },
    { id: 'agentd-remoted', from: 'agentd', to: 'remoted', carries: 'raw' },
    { id: 'remoted-analysisd', from: 'remoted', to: 'analysisd', carries: 'raw' },
    { id: 'analysisd-alerts', from: 'analysisd', to: 'alerts', carries: 'alert' },
    { id: 'alerts-filebeat', from: 'alerts', to: 'filebeat', carries: 'alert' },
    { id: 'filebeat-indexer', from: 'filebeat', to: 'indexer', carries: 'alert' },
    { id: 'indexer-dashboard', from: 'indexer', to: 'dashboard', down: true, carries: 'alert' },
  ],
  emitters: [
    { link: 'logcollector-agentd', every: 430, kind: () => (Math.random() < 0.09 ? 'suspicious' : 'raw') },
    { link: 'syscheck-agentd', every: 900, kind: 'raw' },
    { link: 'syscollector-agentd', every: 1400, kind: 'raw' },
  ],
  initialState: () => ({
    queue: 0,
    queuePeak: 0,
    overflowed: 0,
    phase: 0,
    analysed: 0,
    silent: 0,
    written: 0,
    indexed: 0,
    window: 0,
    composites: 0,
    drainAcc: 0,
  }),
  onTick: (dt, api) => {
    const state = api.state
    // analysisd works through its queue at its own pace, one event at a time
    state.drainAcc += dt
    while (state.drainAcc > DRAIN_EVERY && state.queue > 0) {
      state.drainAcc -= DRAIN_EVERY
      state.queue -= 1
      api.spawn('remoted-analysisd', state.queueKinds?.shift() ?? 'raw')
    }
  },
  arrive: (nodeId, packet, api) => {
    const state = api.state
    if (nodeId === 'agentd') {
      api.spawn('agentd-remoted', packet.kind)
      return
    }
    if (nodeId === 'remoted') {
      // everything the agent sends lines up here for the single analysis process
      if (state.queue >= QUEUE_CAP) {
        state.overflowed += 1
        return
      }
      state.queue += 1
      state.queuePeak = Math.max(state.queuePeak, state.queue)
      state.queueKinds = state.queueKinds ?? []
      state.queueKinds.push(packet.kind)
      return
    }
    if (nodeId === 'analysisd') {
      state.analysed += 1
      state.phase = (state.phase + 1) % 4
      if (packet.kind !== 'suspicious') {
        // decoded and tested, matched nothing worth alerting on
        state.silent += 1
        return
      }
      api.spawn('analysisd-alerts', 'alert')
      state.window += 1
      if (state.window >= THRESHOLD) {
        state.window = 0
        api.spawn('analysisd-alerts', 'composite')
      }
      return
    }
    if (nodeId === 'alerts') {
      state.written += 1
      api.spawn('alerts-filebeat', packet.kind)
      return
    }
    if (nodeId === 'filebeat') {
      api.spawn('filebeat-indexer', packet.kind)
      return
    }
    if (nodeId === 'indexer') {
      state.indexed += 1
      api.spawn('indexer-dashboard', packet.kind)
      return
    }
    if (nodeId === 'dashboard' && packet.kind === 'composite') {
      state.composites += 1
    }
  },
  overlays: [
    {
      node: 'remoted',
      type: 'bar',
      label: (s) => `queue ${s.queue} / ${QUEUE_CAP}`,
      value: (s) => s.queue / QUEUE_CAP,
      alert: (s) => s.queue > QUEUE_CAP * 0.75,
    },
    {
      node: 'analysisd',
      type: 'lights',
      items: ['pre', 'decode', 'rule', 'alert'],
      value: (s) => s.phase,
    },
    { node: 'analysisd', type: 'mono', value: (s) => `${s.silent.toLocaleString()} produced no alert` },
    {
      node: 'analysisd',
      type: 'bar',
      label: (s) => `frequency ${s.window} / ${THRESHOLD}`,
      value: (s) => s.window / THRESHOLD,
      alert: (s) => s.window >= THRESHOLD - 1,
    },
    { node: 'alerts', type: 'mono', tone: 'good', value: (s) => `${s.written} lines written` },
    { node: 'dashboard', type: 'big', value: (s) => s.composites, suffix: 'level 10' },
  ],
  stats: [
    { label: 'events analysed', value: (s) => s.analysed.toLocaleString(), tone: 'plain' },
    { label: 'produced no alert at all', value: (s) => s.silent.toLocaleString(), tone: 'good' },
    { label: 'dropped, queue full', value: (s) => s.overflowed, tone: 'bad' },
  ],
  actions: [
    {
      label: 'Overload the analysis queue',
      run: (api) => {
        for (let i = 0; i < 45; i += 1) api.spawn('logcollector-agentd', 'raw')
      },
    },
  ],
  dockProgress: (s) => `queue ${s.queue} · ${s.composites} level-10 alerts`,
}
