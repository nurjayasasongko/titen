/**
 * AWS WAF: a web ACL in front of the resource, and a different decision
 * model altogether.
 *
 * There is no accumulating score here. Rules are evaluated in priority
 * order and the first one with a terminating action ends it — so the same
 * two rules in the other order give you a different answer. Watch which
 * rule number stops each request.
 */
const RULES = ['1 allowlist', '2 rate', '3 SQLi', '4 CRS']

export default {
  id: 'waf-aws',
  label: 'AWS WAF web ACL, live',
  viewBox: { width: 1000, height: 312 },
  decorations: [
    { x: 206, y1: 40, y2: 180 },
    { x: 508, y1: 30, y2: 300, dashed: true, label: 'your infrastructure →' },
  ],
  kinds: {
    request: { label: 'ordinary request', fill: '#94a3b8', size: 5 },
    attack: { label: 'attack', fill: '#f59e0b', size: 5.5 },
    oversize: { label: 'body past the inspection limit', fill: '#a855f7', size: 6 },
    allowed: { label: 'forwarded to the ALB', fill: '#10b981', size: 5 },
    blocked: { label: 'blocked at the edge', fill: '#f43f5e', size: 9, shape: 'diamond' },
  },
  nodes: [
    { id: 'internet', kind: 'source', label: 'Customers', sub: 'the internet', x: 16, y: 46, w: 150, h: 52 },
    { id: 'attacker', kind: 'source', label: 'Attacker', sub: 'some padded, some not', x: 16, y: 116, w: 150, h: 52 },
    { id: 'acl', kind: 'process', label: 'CloudFront + web ACL', sub: 'priority order · first terminating action wins', x: 254, y: 44, w: 226, h: 126 },
    { id: 'blocked', kind: 'sink', tone: 'alert', label: 'Blocked', sub: 'never reaches your account', x: 254, y: 208, w: 226, h: 74 },
    { id: 'alb', kind: 'process', label: 'Load balancer', sub: 'your VPC', x: 552, y: 62, w: 150, h: 90 },
    { id: 'app', kind: 'sink', label: 'Application', sub: 'the thing you built', x: 744, y: 62, w: 150, h: 90 },
  ],
  links: [
    { id: 'internet-acl', from: 'internet', to: 'acl', bus: 206, carries: 'request' },
    { id: 'attacker-acl', from: 'attacker', to: 'acl', bus: 206, carries: 'request' },
    { id: 'acl-blocked', from: 'acl', to: 'blocked', down: true, carries: 'alert' },
    { id: 'acl-alb', from: 'acl', to: 'alb', carries: 'request' },
    { id: 'alb-app', from: 'alb', to: 'app', carries: 'request' },
  ],
  emitters: [
    { link: 'internet-acl', every: 380, kind: 'request' },
    {
      link: 'attacker-acl',
      every: 1200,
      // roughly a third of the attacks pad the body past what AWS WAF reads
      kind: () => (Math.random() < 0.34 ? 'oversize' : 'attack'),
    },
  ],
  initialState: () => ({ rule: 0, served: 0, blocked: 0, slipped: 0, counted: 0 }),
  arrive: (nodeId, packet, api) => {
    const state = api.state
    const intent = packet.kind === 'request' ? 'legit' : 'attack'

    if (nodeId === 'acl') {
      if (packet.kind === 'oversize') {
        // the body is larger than the ACL will inspect, so the matching rule
        // never sees the payload and evaluation simply continues
        state.rule = 3
        state.slipped += 1
        api.spawn('acl-alb', 'oversize', { intent })
        return
      }
      if (packet.kind === 'attack') {
        state.rule = 2
        api.spawn('acl-blocked', 'blocked', { intent })
        return
      }
      // ordinary traffic is counted by earlier rules without being stopped
      state.rule = Math.random() < 0.3 ? 1 : 0
      if (state.rule === 1) state.counted += 1
      api.spawn('acl-alb', 'allowed', { intent })
      return
    }
    if (nodeId === 'alb') {
      api.spawn('alb-app', packet.kind, { intent })
      return
    }
    if (nodeId === 'app') {
      // oversize attacks were already counted when the ACL declined to read them
      if (intent !== 'attack') state.served += 1
      return
    }
    if (nodeId === 'blocked') state.blocked += 1
  },
  overlays: [
    { node: 'acl', type: 'lights', items: RULES, value: (s) => s.rule },
    { node: 'acl', type: 'mono', value: (s) => `${s.counted} matched a Count rule and carried on` },
    { node: 'blocked', type: 'big', value: (s) => s.blocked, suffix: 'blocked' },
    { node: 'app', type: 'mono', tone: 'good', value: (s) => `${s.served.toLocaleString()} served` },
    { node: 'app', type: 'mono', tone: 'bad', value: (s) => `${s.slipped} arrived uninspected` },
  ],
  stats: [
    { label: 'blocked before your VPC', value: (s) => s.blocked, tone: 'good' },
    { label: 'bodies too large to inspect', value: (s) => s.slipped, tone: 'bad' },
    { label: 'Count matches (not blocks)', value: (s) => s.counted, tone: 'plain' },
  ],
  actions: [
    {
      label: 'Pad the payload past the body limit',
      run: (api) => {
        for (let i = 0; i < 8; i += 1) api.spawn('attacker-acl', 'oversize')
      },
    },
  ],
  dockProgress: (s) => `${s.blocked} blocked · ${s.slipped} uninspected`,
}
