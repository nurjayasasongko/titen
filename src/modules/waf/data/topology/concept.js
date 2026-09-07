/**
 * A WAF from above: everything arriving on port 443, most of it fine, and a
 * dial in the middle that decides how suspicious to be about it.
 *
 * The paranoia button is the whole lesson. Push it up and watch two counters
 * move in opposite directions — fewer attacks reach the app, and more real
 * customers get a 403.
 */
const THRESHOLD = 5

// how often each paranoia level fires on ordinary traffic, and how much of
// the attack traffic it manages to catch
const PROFILE = {
  1: { falsePositive: 0.01, caught: 0.82 },
  2: { falsePositive: 0.05, caught: 0.94 },
  3: { falsePositive: 0.19, caught: 0.99 },
  4: { falsePositive: 0.42, caught: 1.0 },
}

export default {
  id: 'waf-concept',
  label: 'WAF, live',
  viewBox: { width: 1080, height: 348 },
  decorations: [{ x: 206, y1: 44, y2: 176 }],
  kinds: {
    request: { label: 'ordinary request', fill: '#94a3b8', size: 5 },
    attack: { label: 'attack, still disguised', fill: '#f59e0b', size: 5.5 },
    decoded: { label: 'attack, disguise removed', fill: '#fb923c', size: 6 },
    allowed: { label: 'forwarded to your app', fill: '#10b981', size: 5 },
    blocked: { label: '403 refused', fill: '#f43f5e', size: 9, shape: 'diamond' },
  },
  nodes: [
    { id: 'customers', kind: 'source', label: 'Customers', sub: 'browsers · mobile app', x: 16, y: 18, w: 150, h: 48 },
    { id: 'partners', kind: 'source', label: 'API clients', sub: 'integrations', x: 16, y: 78, w: 150, h: 48 },
    { id: 'attacker', kind: 'source', label: 'Attacker', sub: 'scanners · payloads', x: 16, y: 138, w: 150, h: 48 },
    { id: 'phase1', kind: 'process', label: 'Phase 1', sub: 'request headers', x: 244, y: 52, w: 148, h: 92 },
    { id: 'phase2', kind: 'process', label: 'Phase 2', sub: 'request body', x: 414, y: 52, w: 148, h: 92 },
    { id: 'normalise', kind: 'process', label: 'Normalise', sub: 'decode · fold case', x: 584, y: 52, w: 156, h: 92 },
    { id: 'decide', kind: 'process', label: 'Score vs threshold', sub: 'one rule decides', x: 762, y: 52, w: 158, h: 92 },
    { id: 'origin', kind: 'sink', label: 'Your app', sub: 'never sees the rest', x: 942, y: 18, w: 122, h: 78 },
    { id: 'blocked', kind: 'sink', tone: 'alert', label: '403', sub: 'refused at the WAF', x: 942, y: 132, w: 122, h: 78 },
    { id: 'audit', kind: 'sink', label: 'Audit log', sub: 'every rule that matched', x: 584, y: 250, w: 200, h: 62 },
  ],
  links: [
    { id: 'customers-phase1', from: 'customers', to: 'phase1', bus: 206, carries: 'request' },
    { id: 'partners-phase1', from: 'partners', to: 'phase1', bus: 206, carries: 'request' },
    { id: 'attacker-phase1', from: 'attacker', to: 'phase1', bus: 206, carries: 'request' },
    { id: 'phase1-phase2', from: 'phase1', to: 'phase2', carries: 'request' },
    { id: 'phase2-normalise', from: 'phase2', to: 'normalise', carries: 'request' },
    { id: 'normalise-decide', from: 'normalise', to: 'decide', carries: 'request' },
    { id: 'decide-origin', from: 'decide', to: 'origin', carries: 'request' },
    { id: 'decide-blocked', from: 'decide', to: 'blocked', carries: 'alert' },
    { id: 'normalise-audit', from: 'normalise', to: 'audit', down: true, carries: 'request' },
  ],
  emitters: [
    { link: 'customers-phase1', every: 340, kind: 'request' },
    { link: 'partners-phase1', every: 620, kind: 'request' },
    { link: 'attacker-phase1', every: 1500, kind: 'attack' },
  ],
  initialState: () => ({
    pl: 1,
    served: 0,
    blockedAttacks: 0,
    blockedCustomers: 0,
    leaked: 0,
    logged: 0,
  }),
  arrive: (nodeId, packet, api) => {
    const state = api.state
    const intent = packet.intent ?? (packet.kind === 'attack' ? 'attack' : 'legit')

    if (nodeId === 'phase1') {
      api.spawn('phase1-phase2', packet.kind, { intent })
      return
    }
    if (nodeId === 'phase2') {
      api.spawn('phase2-normalise', packet.kind, { intent })
      return
    }
    if (nodeId === 'normalise') {
      // the disguise comes off here, which is the only reason the next box
      // has anything to match against
      api.spawn('normalise-decide', intent === 'attack' ? 'decoded' : 'request', { intent })
      if (intent === 'attack') api.spawn('normalise-audit', 'decoded', { intent })
      return
    }
    if (nodeId === 'decide') {
      const profile = PROFILE[state.pl]
      const blocked =
        intent === 'attack' ? Math.random() < profile.caught : Math.random() < profile.falsePositive
      if (blocked) {
        api.spawn('decide-blocked', 'blocked', { intent })
      } else {
        api.spawn('decide-origin', 'allowed', { intent })
      }
      return
    }
    if (nodeId === 'origin') {
      if (intent === 'attack') state.leaked += 1
      else state.served += 1
      return
    }
    if (nodeId === 'blocked') {
      if (intent === 'attack') state.blockedAttacks += 1
      else state.blockedCustomers += 1
      return
    }
    if (nodeId === 'audit') state.logged += 1
  },
  overlays: [
    {
      node: 'decide',
      type: 'bar',
      label: (s) => `paranoia PL${s.pl} · threshold ${THRESHOLD}`,
      value: (s) => s.pl / 4,
      alert: (s) => s.pl >= 3,
    },
    { node: 'decide', type: 'mono', value: (s) => `${Math.round(PROFILE[s.pl].falsePositive * 100)}% of normal traffic trips it` },
    { node: 'origin', type: 'mono', tone: 'good', value: (s) => `${s.served.toLocaleString()} served` },
    { node: 'origin', type: 'mono', tone: 'bad', value: (s) => `${s.leaked} attacks got in` },
    { node: 'blocked', type: 'big', value: (s) => s.blockedCustomers, suffix: 'customers' },
    { node: 'audit', type: 'mono', value: (s) => `${s.logged} matches recorded — most were allowed anyway` },
  ],
  stats: [
    { label: 'customers served', value: (s) => s.served.toLocaleString(), tone: 'good' },
    { label: 'attacks blocked', value: (s) => s.blockedAttacks, tone: 'plain' },
    { label: 'customers wrongly blocked', value: (s) => s.blockedCustomers, tone: 'bad' },
  ],
  actions: [
    {
      label: 'Turn the paranoia up',
      run: (api) => {
        api.state.pl = (api.state.pl % 4) + 1
      },
    },
    {
      label: 'Send a wave of attacks',
      run: (api) => {
        for (let i = 0; i < 10; i += 1) api.spawn('attacker-phase1', 'attack', { intent: 'attack' })
      },
    },
  ],
  dockProgress: (s) => `PL${s.pl} · ${s.blockedCustomers} customers blocked`,
}
