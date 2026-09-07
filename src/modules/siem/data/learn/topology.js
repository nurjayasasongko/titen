/**
 * The vendor-neutral bird's-eye view used in Level 1: many machines, one
 * pipeline, and a torrent of events narrowing to a single alert.
 */
const THRESHOLD = 8

export default {
  id: 'siem-concept',
  label: 'SIEM pipeline, live',
  viewBox: { width: 1080, height: 372 },
  decorations: [{ x: 224, y1: 44, y2: 260 }],
  kinds: {
    raw: { label: 'raw log line', fill: '#94a3b8', size: 5 },
    parsed: { label: 'normalised event', fill: '#0ea5e9', size: 5 },
    suspicious: { label: 'failed login', fill: '#f59e0b', size: 5.5 },
    alert: { label: 'alert', fill: '#f43f5e', size: 9, shape: 'diamond' },
  },
  nodes: [
    { id: 'win', kind: 'source', label: 'Windows servers', sub: '4625 · 4624 · 4688', x: 16, y: 16, w: 156, h: 56 },
    { id: 'lin', kind: 'source', label: 'Linux servers', sub: 'sshd · sudo · auditd', x: 16, y: 88, w: 156, h: 56 },
    { id: 'fw', kind: 'source', label: 'Firewall', sub: 'accept · deny', x: 16, y: 160, w: 156, h: 56 },
    { id: 'ws', kind: 'source', label: 'Workstations', sub: 'endpoint agent', x: 16, y: 232, w: 156, h: 56 },
    { id: 'collector', kind: 'process', label: 'Collector', sub: 'buffer · forward', x: 274, y: 112, w: 150, h: 84 },
    { id: 'parser', kind: 'process', label: 'Parser', sub: 'raw → fields', x: 486, y: 112, w: 150, h: 84 },
    { id: 'store', kind: 'sink', label: 'Storage', sub: 'every event kept', x: 486, y: 272, w: 150, h: 64 },
    { id: 'correlate', kind: 'process', label: 'Correlation', sub: '5 min window', x: 698, y: 112, w: 150, h: 84 },
    { id: 'dash', kind: 'sink', tone: 'alert', label: 'Dashboard', sub: 'analyst queue', x: 910, y: 112, w: 154, h: 84 },
  ],
  links: [
    { id: 'win-collector', from: 'win', to: 'collector', bus: 224, carries: 'raw' },
    { id: 'lin-collector', from: 'lin', to: 'collector', bus: 224, carries: 'raw' },
    { id: 'fw-collector', from: 'fw', to: 'collector', bus: 224, carries: 'raw' },
    { id: 'ws-collector', from: 'ws', to: 'collector', bus: 224, carries: 'raw' },
    { id: 'collector-parser', from: 'collector', to: 'parser', carries: 'raw' },
    { id: 'parser-correlate', from: 'parser', to: 'correlate', carries: 'parsed' },
    { id: 'parser-store', from: 'parser', to: 'store', down: true, carries: 'parsed' },
    { id: 'correlate-dash', from: 'correlate', to: 'dash', carries: 'alert' },
  ],
  emitters: [
    { link: 'win-collector', every: 600, kind: () => (Math.random() < 0.07 ? 'suspicious' : 'raw') },
    { link: 'lin-collector', every: 450, kind: 'raw' },
    { link: 'fw-collector', every: 1080, kind: 'raw' },
    { link: 'ws-collector', every: 360, kind: 'raw' },
  ],
  initialState: () => ({ ingested: 0, stored: 0, alerts: 0, window: 0, decay: 0 }),
  onEmit: (_emitter, api) => {
    api.state.ingested += 1
  },
  onTick: (dt, api) => {
    // the window forgets failures that fall out of the back of it
    const state = api.state
    state.decay += dt
    if (state.decay > 9000) {
      state.decay = 0
      if (state.window > 0) state.window -= 1
    }
  },
  arrive: (nodeId, packet, api) => {
    const state = api.state
    if (nodeId === 'collector') {
      api.spawn('collector-parser', packet.kind)
      return
    }
    if (nodeId === 'parser') {
      api.spawn('parser-correlate', packet.kind === 'suspicious' ? 'suspicious' : 'parsed')
      api.spawn('parser-store', 'parsed')
      return
    }
    if (nodeId === 'store') {
      state.stored += 1
      return
    }
    if (nodeId === 'correlate') {
      if (packet.kind === 'suspicious') {
        state.window += 1
        if (state.window >= THRESHOLD) {
          state.window = 0
          api.spawn('correlate-dash', 'alert')
        }
      }
      return
    }
    if (nodeId === 'dash') state.alerts += 1
  },
  overlays: [
    {
      node: 'correlate',
      type: 'bar',
      label: (s) => `failures: ${s.window} / ${THRESHOLD}`,
      value: (s) => s.window / THRESHOLD,
      alert: (s) => s.window >= THRESHOLD - 1,
    },
    { node: 'store', type: 'mono', tone: 'good', value: (s) => `${s.stored.toLocaleString()} kept` },
    { node: 'dash', type: 'big', value: (s) => s.alerts, suffix: 'alert' },
  ],
  stats: [
    { label: 'events collected', value: (s) => s.ingested.toLocaleString(), tone: 'plain' },
    { label: 'events stored', value: (s) => s.stored.toLocaleString(), tone: 'good' },
    { label: 'humans interrupted', value: (s) => s.alerts.toLocaleString(), tone: 'bad' },
  ],
  actions: [
    {
      label: 'Launch a brute-force burst',
      // auto-pin one of the failed logins so the inspector opens on it and you
      // can watch that single packet climb the correlation counter
      follow: 'suspicious',
      run: (api) => {
        for (let i = 0; i < 11; i += 1) api.spawn('win-collector', 'suspicious')
        api.state.ingested += 11
      },
    },
  ],
  // what the packet inspector shows at each stage it crosses. Keyed off the
  // box it just arrived at, reusing the same arrival events that recolour the
  // dots — so the panel updates in lockstep with the animation.
  inspect: (nodeId, packet, state) => {
    const host = {
      win: 'WIN-APP01 (Windows Server)',
      lin: 'web01 (Linux)',
      fw: 'fw-edge-01 (Firewall)',
      ws: 'WS-4471 (Workstation)',
    }[packet.origin] ?? 'unknown host'
    const suspicious = packet.kind === 'suspicious'

    const rawByOrigin = {
      win: suspicious
        ? 'LogName=Security  EventCode=4625\nAccount Name: j.reyes  Logon Type: 3\nSource Network Address: 203.0.113.47\nFailure Reason: Unknown user name or bad password'
        : 'LogName=Security  EventCode=4624\nAccount Name: m.okafor  Logon Type: 7\n(An account was successfully logged on)',
      lin: 'sshd[2201]: Accepted publickey for deploy\nfrom 10.20.4.9 port 55122 ssh2',
      fw: '%ASA-6-106023: Deny tcp\nsrc outside:198.51.100.7/44012\ndst inside:10.20.4.31/443 by access-group',
      ws: 'Sysmon EventID=1 Process Create\nImage: powershell.exe  Parent: explorer.exe',
    }

    if (nodeId === 'collector') {
      return {
        type: 'raw',
        text: rawByOrigin[packet.origin] ?? 'raw log line',
        footer: `Still the original text ${host} wrote. The collector only added an envelope — it has not been understood yet.`,
      }
    }
    if (nodeId === 'parser') {
      return suspicious
        ? {
            type: 'fields',
            pairs: [
              ['event_category', 'Authentication'],
              ['event_outcome', 'failure'],
              ['user', 'j.reyes'],
              ['src_ip', '203.0.113.47'],
              ['dest_host', host.split(' ')[0]],
              ['signature_id', '4625'],
            ],
            footer: 'Now structured fields with shared names — a rule can reason about this.',
          }
        : {
            type: 'fields',
            pairs: [
              ['event_category', packet.origin === 'fw' ? 'Network' : 'Authentication'],
              ['event_outcome', packet.origin === 'fw' ? 'blocked' : 'success'],
              ['dest_host', host.split(' ')[0]],
            ],
            footer: 'Parsed into the same schema, even though the raw text looked nothing alike.',
          }
    }
    if (nodeId === 'store') {
      return {
        type: 'note',
        tone: 'good',
        text: 'Written to storage. Every event is kept here for search — whether or not it ever becomes an alert.',
      }
    }
    if (nodeId === 'correlate') {
      if (!suspicious) {
        return {
          type: 'note',
          text: 'Not an authentication failure — nothing to correlate. This event now only lives in storage.',
        }
      }
      if (state.window === 0) {
        return {
          type: 'note',
          tone: 'alert',
          text: 'This was the 8th failure for j.reyes inside the 5-minute window. Threshold reached — an alert is raised and sent to the dashboard.',
        }
      }
      return {
        type: 'note',
        tone: 'suspicious',
        text: `Counted: ${state.window}/8 failures for j.reyes in the 5-minute window. Below the threshold — held, waiting to see if more arrive.`,
      }
    }
    if (nodeId === 'dash') {
      return {
        type: 'note',
        tone: 'alert',
        text: 'ALERT — “Multiple failed logins for j.reyes”, 8 events from one source. Now an item in the analyst queue with a severity and an owner.',
      }
    }
    return null
  },
  dockProgress: (s) => `${s.ingested.toLocaleString()} in · ${s.alerts} alerts`,
}
