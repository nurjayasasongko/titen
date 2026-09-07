import WafModule from './WafModule.jsx'

export default {
  id: 'waf',
  name: 'Web application firewall',
  category: 'Controls',
  icon: 'globe',
  summary:
    'An HTTP request walking through a WAF: normalised, matched against rules, scored, and blocked — or waved through, which is sometimes the worse outcome.',
  question: 'Why did the WAF block a perfectly normal customer request?',
  covers: [
    'What a WAF can see that a network firewall cannot, on the same connection',
    'Phases: why a correct rule in the wrong phase silently never matches',
    'Evasion and normalisation — the same payload spelled five ways',
    'Anomaly scoring, paranoia levels, and tuning a false positive without deleting the protection',
  ],
  views: [
    { id: 'learn', label: 'Learn how a WAF works', note: 'No product names. Start here.' },
    {
      id: 'implementations',
      label: 'See it in real products',
      note: 'ModSecurity + CRS · AWS WAF · Cloudflare',
    },
  ],
  defaultView: 'learn',
  component: WafModule,
}
