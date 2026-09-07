import siem from './siem/index.js'
import waf from './waf/index.js'
import auth from './auth/index.js'

/**
 * The site's table of contents.
 *
 * A module is one security system explained by animating what it actually
 * does. Adding one means writing its folder under src/modules/, exporting a
 * manifest shaped like siem/index.js, and adding it to this list — nothing
 * in the shell needs to change.
 *
 * Modules without a `component` are planned: the catalogue shows what they
 * will cover, and they are not clickable yet.
 */
export const modules = [
  siem,
  waf,
  auth,
  {
    id: 'windows-logging',
    name: 'Windows logging',
    category: 'Where logs come from',
    icon: 'server',
    summary:
      'Where a Windows event actually comes from, and why half the events you expect are not being written at all.',
    question: 'Why does Event ID 4625 exist, and why is 4688 missing on my servers?',
    covers: [
      'Providers, ETW and the Event Log service — who writes the event, and who just carries it',
      'Channels: Security, System, Application, and the Applications and Services tree',
      'Audit policy: why an event is silent until someone enables the subcategory that produces it',
      'What Sysmon adds that the built-in auditing cannot see',
    ],
  },
  {
    id: 'firewall',
    name: 'Firewall',
    category: 'Controls',
    icon: 'brick',
    summary:
      'How a packet is judged: rule order, first match wins, and the state table that lets replies back in without a rule of their own.',
    question: 'My rule looks correct. Why is the traffic still being dropped?',
    covers: [
      'Top-down rule evaluation and why the order of two correct rules changes the outcome',
      'The connection state table — established, related, new — and why return traffic needs no rule',
      'Where NAT happens relative to filtering, which is why you match on the wrong address',
      'Reading a deny log line: which rule, which direction, which interface',
    ],
  },
  {
    id: 'edr',
    name: 'EDR and process trees',
    category: 'Detection & response',
    icon: 'cpu',
    summary:
      'What an endpoint agent can and cannot see, drawn as a live process tree with the telemetry it emits.',
    question: 'The alert says “suspicious parent process”. Suspicious compared to what?',
    covers: [
      'Process ancestry, and why winword.exe spawning powershell.exe is the whole detection',
      'Where the telemetry comes from: kernel callbacks, ETW, user-mode hooks',
      'Process injection shown as what the tree looks like before and after',
      'Why an attacker living off the land produces a tree that looks almost normal',
    ],
  },
]

export function getModule(id) {
  return modules.find((module) => module.id === id) ?? null
}

export const categories = [
  'Where logs come from',
  'Controls',
  'Identity',
  'Detection & response',
]
