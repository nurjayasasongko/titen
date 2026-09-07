/**
 * ModSecurity / Coraza: the WAF is a module inside your own web server.
 *
 * Notice where the block happens relative to the boundary line. Refused
 * traffic has already crossed your network, opened a connection to your
 * server and spent your CPU being inspected. You get the verdict; you also
 * get the bill.
 */
const THRESHOLD = 5

export default {
  id: 'waf-modsec',
  label: 'ModSecurity in your web server, live',
  viewBox: { width: 1000, height: 312 },
  decorations: [
    { x: 206, y1: 40, y2: 180 },
    { x: 224, y1: 30, y2: 300, dashed: true, label: 'your infrastructure →' },
  ],
  kinds: {
    request: { label: 'ordinary request', fill: '#94a3b8', size: 5 },
    attack: { label: 'attack', fill: '#f59e0b', size: 5.5 },
    allowed: { label: 'passed to the app', fill: '#10b981', size: 5 },
    blocked: { label: '403 from your server', fill: '#f43f5e', size: 9, shape: 'diamond' },
  },
  nodes: [
    { id: 'internet', kind: 'source', label: 'Customers', sub: 'the internet', x: 16, y: 46, w: 150, h: 52 },
    { id: 'attacker', kind: 'source', label: 'Attacker', sub: 'the same wire', x: 16, y: 116, w: 150, h: 52 },
    { id: 'lb', kind: 'process', label: 'Load balancer', sub: 'yours to run', x: 262, y: 62, w: 148, h: 90 },
    { id: 'waf', kind: 'process', label: 'nginx + ModSecurity', sub: 'SecRuleEngine On', x: 452, y: 50, w: 194, h: 114 },
    { id: 'app', kind: 'sink', label: 'Application', sub: 'behind the module', x: 700, y: 22, w: 150, h: 78 },
    { id: 'blocked', kind: 'sink', tone: 'alert', label: '403', sub: 'refused inside your server', x: 700, y: 132, w: 150, h: 78 },
    { id: 'audit', kind: 'sink', label: 'audit log', sub: 'on your disk', x: 452, y: 222, w: 194, h: 58 },
  ],
  links: [
    { id: 'internet-lb', from: 'internet', to: 'lb', bus: 206, carries: 'request' },
    { id: 'attacker-lb', from: 'attacker', to: 'lb', bus: 206, carries: 'request' },
    { id: 'lb-waf', from: 'lb', to: 'waf', carries: 'request' },
    { id: 'waf-app', from: 'waf', to: 'app', carries: 'request' },
    { id: 'waf-blocked', from: 'waf', to: 'blocked', carries: 'alert' },
    { id: 'waf-audit', from: 'waf', to: 'audit', down: true, carries: 'request' },
  ],
  emitters: [
    { link: 'internet-lb', every: 380, kind: 'request' },
    { link: 'attacker-lb', every: 1300, kind: 'attack' },
  ],
  initialState: () => ({ score: 0, served: 0, blocked: 0, inspected: 0, cpu: 0 }),
  arrive: (nodeId, packet, api) => {
    const state = api.state
    const intent = packet.intent ?? (packet.kind === 'attack' ? 'attack' : 'legit')
    if (nodeId === 'lb') {
      api.spawn('lb-waf', packet.kind, { intent })
      return
    }
    if (nodeId === 'waf') {
      // every request, including the ones about to be refused, was inspected
      // on hardware you pay for
      state.inspected += 1
      state.cpu += intent === 'attack' ? 3 : 1
      const score = intent === 'attack' ? 5 + Math.floor(Math.random() * 6) : Math.random() < 0.03 ? 5 : 2
      state.score = score
      if (score >= THRESHOLD) {
        api.spawn('waf-blocked', 'blocked', { intent })
        api.spawn('waf-audit', 'attack', { intent })
      } else {
        api.spawn('waf-app', 'allowed', { intent })
      }
      return
    }
    if (nodeId === 'app') state.served += 1
    if (nodeId === 'blocked') state.blocked += 1
  },
  overlays: [
    {
      node: 'waf',
      type: 'bar',
      label: (s) => `anomaly score ${s.score} / ${THRESHOLD}`,
      value: (s) => Math.min(1, s.score / THRESHOLD),
      alert: (s) => s.score >= THRESHOLD,
    },
    { node: 'waf', type: 'mono', value: (s) => `${s.inspected.toLocaleString()} inspected on your CPU` },
    { node: 'app', type: 'mono', tone: 'good', value: (s) => `${s.served.toLocaleString()} served` },
    { node: 'blocked', type: 'big', value: (s) => s.blocked, suffix: 'refused' },
  ],
  stats: [
    { label: 'requests inspected by you', value: (s) => s.inspected.toLocaleString(), tone: 'plain' },
    { label: 'CPU units you spent', value: (s) => s.cpu.toLocaleString(), tone: 'bad' },
    { label: 'refused after entering your network', value: (s) => s.blocked, tone: 'bad' },
  ],
  actions: [
    {
      label: 'Point a scanner at it',
      run: (api) => {
        for (let i = 0; i < 25; i += 1) api.spawn('attacker-lb', 'attack', { intent: 'attack' })
      },
    },
  ],
  dockProgress: (s) => `${s.inspected} inspected · ${s.blocked} refused`,
}
