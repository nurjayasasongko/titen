/**
 * Cloudflare: the rules run on the edge network, so a refused request never
 * reaches anything you own.
 *
 * The scoring shape is the same idea as CRS but on a different scale
 * entirely — matches add to a threat score, and the sensitivity setting
 * chooses which total is enough: High blocks at 25, Medium at 40, Low at 60.
 */
const THRESHOLDS = { High: 25, Medium: 40, Low: 60 }
const ORDER = ['Low', 'Medium', 'High']

export default {
  id: 'waf-cloudflare',
  label: 'Cloudflare WAF at the edge, live',
  viewBox: { width: 1000, height: 312 },
  decorations: [
    { x: 206, y1: 40, y2: 180 },
    { x: 540, y1: 30, y2: 300, dashed: true, label: 'your infrastructure →' },
  ],
  kinds: {
    request: { label: 'ordinary request', fill: '#94a3b8', size: 5 },
    attack: { label: 'attack', fill: '#f59e0b', size: 5.5 },
    allowed: { label: 'forwarded to your origin', fill: '#10b981', size: 5 },
    blocked: { label: 'blocked on the edge network', fill: '#f43f5e', size: 9, shape: 'diamond' },
  },
  nodes: [
    { id: 'internet', kind: 'source', label: 'Customers', sub: 'the internet', x: 16, y: 46, w: 150, h: 52 },
    { id: 'attacker', kind: 'source', label: 'Attacker', sub: 'the same wire', x: 16, y: 116, w: 150, h: 52 },
    { id: 'edge', kind: 'process', label: 'Cloudflare edge', sub: 'managed rulesets · threat score', x: 254, y: 44, w: 240, h: 126 },
    { id: 'blocked', kind: 'sink', tone: 'alert', label: 'Blocked at the edge', sub: 'your servers never hear about it', x: 254, y: 208, w: 240, h: 74 },
    { id: 'origin', kind: 'process', label: 'Your origin', sub: 'only sees what survived', x: 584, y: 62, w: 160, h: 90 },
    { id: 'app', kind: 'sink', label: 'Application', sub: '', x: 786, y: 62, w: 150, h: 90 },
  ],
  links: [
    { id: 'internet-edge', from: 'internet', to: 'edge', bus: 206, carries: 'request' },
    { id: 'attacker-edge', from: 'attacker', to: 'edge', bus: 206, carries: 'request' },
    { id: 'edge-blocked', from: 'edge', to: 'blocked', down: true, carries: 'alert' },
    { id: 'edge-origin', from: 'edge', to: 'origin', carries: 'request' },
    { id: 'origin-app', from: 'origin', to: 'app', carries: 'request' },
  ],
  emitters: [
    { link: 'internet-edge', every: 360, kind: 'request' },
    { link: 'attacker-edge', every: 1250, kind: 'attack' },
  ],
  initialState: () => ({
    sensitivity: 'Medium',
    score: 0,
    served: 0,
    blocked: 0,
    falsePositives: 0,
    reachedOrigin: 0,
  }),
  arrive: (nodeId, packet, api) => {
    const state = api.state
    const intent = packet.kind === 'attack' ? 'attack' : 'legit'
    const threshold = THRESHOLDS[state.sensitivity]

    if (nodeId === 'edge') {
      // matched rules sum into a threat score on Cloudflare's own scale
      const score =
        intent === 'attack'
          ? 30 + Math.floor(Math.random() * 45)
          : Math.floor(Math.random() * 34)
      state.score = score
      if (score >= threshold) {
        if (intent === 'legit') state.falsePositives += 1
        api.spawn('edge-blocked', 'blocked', { intent })
      } else {
        api.spawn('edge-origin', 'allowed', { intent })
      }
      return
    }
    if (nodeId === 'origin') {
      state.reachedOrigin += 1
      api.spawn('origin-app', packet.kind, { intent })
      return
    }
    if (nodeId === 'app') state.served += 1
    if (nodeId === 'blocked') state.blocked += 1
  },
  overlays: [
    {
      node: 'edge',
      type: 'bar',
      label: (s) => `threat score ${s.score} · ${s.sensitivity} blocks at ${THRESHOLDS[s.sensitivity]}`,
      value: (s) => Math.min(1, s.score / THRESHOLDS[s.sensitivity]),
      alert: (s) => s.score >= THRESHOLDS[s.sensitivity],
    },
    { node: 'edge', type: 'mono', value: (s) => `${s.falsePositives} customers caught by this setting` },
    { node: 'blocked', type: 'big', value: (s) => s.blocked, suffix: 'never reached you' },
    { node: 'origin', type: 'mono', value: (s) => `${s.reachedOrigin.toLocaleString()} crossed the line` },
    { node: 'app', type: 'mono', tone: 'good', value: (s) => `${s.served.toLocaleString()} served` },
  ],
  stats: [
    { label: 'stopped before your network', value: (s) => s.blocked, tone: 'good' },
    { label: 'requests your origin handled', value: (s) => s.reachedOrigin.toLocaleString(), tone: 'plain' },
    { label: 'customers caught by the setting', value: (s) => s.falsePositives, tone: 'bad' },
  ],
  actions: [
    {
      label: 'Change sensitivity',
      run: (api) => {
        const next = (ORDER.indexOf(api.state.sensitivity) + 1) % ORDER.length
        api.state.sensitivity = ORDER[next]
      },
    },
  ],
  dockProgress: (s) => `${s.sensitivity} · ${s.blocked} blocked`,
}
