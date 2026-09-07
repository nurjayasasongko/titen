/**
 * The requests every demo in this module works on. Two attacks and two
 * perfectly ordinary requests — the point of the module is that telling
 * them apart automatically is harder than it sounds.
 */
export const requests = [
  {
    id: 'obvious-attack',
    label: 'Obvious attack',
    intent: 'attack',
    blurb: 'A scanner probing a search box, not trying to hide at all.',
    method: 'GET',
    path: '/search',
    headers: {
      Host: 'shop.example.com',
      'User-Agent': 'sqlmap/1.7.2#stable (https://sqlmap.org)',
      Accept: '*/*',
    },
    args: { q: "' OR 1=1 --" },
  },
  {
    id: 'evasive-attack',
    label: 'The same attack, hidden',
    intent: 'attack',
    blurb: 'Identical payload, percent-encoded and case-shuffled, sent from a browser-shaped User-Agent.',
    method: 'GET',
    path: '/search',
    headers: {
      Host: 'shop.example.com',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    args: { q: '%27%20oR%201%3D1%20%2D%2D' },
  },
  {
    id: 'schema-probe',
    intent: 'attack',
    label: 'Quiet database enumeration',
    blurb: 'No quotes, no scanner User-Agent, no obvious payload — just an attacker asking your database to describe itself. At PL1 exactly one rule stands between this and your schema.',
    method: 'GET',
    path: '/product',
    headers: {
      Host: 'shop.example.com',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    args: { id: '1 AND (SELECT COUNT(*) FROM information_schema.columns) > 0' },
  },
  {
    id: 'support-ticket',
    label: 'A real support ticket',
    intent: 'legitimate',
    blurb: 'A developer pasting the slow query they need help with, into your own support form.',
    method: 'POST',
    path: '/api/tickets',
    headers: {
      Host: 'shop.example.com',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    args: {
      subject: 'Checkout page is slow',
      comment: 'SELECT * FROM orders WHERE id = 1 -- this query takes 40s, can someone look?',
    },
  },
  {
    id: 'chatty-customer',
    label: 'A chatty customer',
    intent: 'legitimate',
    blurb: 'No SQL anywhere — just a frustrated human using a lot of punctuation.',
    method: 'POST',
    path: '/api/tickets',
    headers: {
      Host: 'shop.example.com',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1',
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    args: {
      subject: "Can't log in!",
      comment:
        'Hi! I can\'t log in -- it says "user\'s session expired (again?)". Order #1234; help!!',
    },
  },
]

export function getRequest(id) {
  return requests.find((request) => request.id === id) ?? requests[0]
}

/** Flattens a request into the raw HTTP a WAF would actually receive. */
export function toRawHttp(request) {
  const query =
    request.method === 'GET' && Object.keys(request.args).length
      ? '?' + Object.entries(request.args).map(([k, v]) => `${k}=${v}`).join('&')
      : ''
  const lines = [`${request.method} ${request.path}${query} HTTP/1.1`]
  for (const [name, value] of Object.entries(request.headers)) {
    lines.push(`${name}: ${value}`)
  }
  if (request.method !== 'GET') {
    const body = Object.entries(request.args)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    lines.push('', body)
  }
  return lines.join('\n')
}
