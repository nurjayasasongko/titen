/**
 * Event timelines for the correlation demo, fixed rather than random so the
 * two scenarios always tell the same story.
 *
 * Times are seconds into a five-minute window.
 */
export const scenarios = [
  {
    id: 'normal',
    label: 'A normal Tuesday',
    description:
      'People mistyping passwords across the company. Same event type, spread thin — three different accounts, minutes apart.',
    verdict: 'No pattern. A per-event alert would have fired 6 times here, all noise.',
    events: [
      { t: 12, user: 'a.chen' },
      { t: 47, user: 'j.reyes' },
      { t: 96, user: 'm.okafor' },
      { t: 150, user: 'a.chen' },
      { t: 214, user: 'r.silva' },
      { t: 268, user: 'j.reyes' },
    ],
  },
  {
    id: 'attack',
    label: 'Password spraying',
    description:
      'One source address working through passwords against a single account, then moving on. Same event type as above — a completely different shape in time.',
    verdict: 'Eleven failures against one account inside two minutes. Humans do not do this.',
    events: [
      { t: 20, user: 'a.chen' },
      { t: 62, user: 'j.reyes' },
      { t: 118, user: 'j.reyes' },
      { t: 126, user: 'j.reyes' },
      { t: 133, user: 'j.reyes' },
      { t: 141, user: 'j.reyes' },
      { t: 148, user: 'j.reyes' },
      { t: 156, user: 'j.reyes' },
      { t: 163, user: 'j.reyes' },
      { t: 171, user: 'j.reyes' },
      { t: 178, user: 'j.reyes' },
      { t: 186, user: 'j.reyes' },
      { t: 194, user: 'j.reyes' },
      { t: 240, user: 'r.silva' },
    ],
  },
]

export const DURATION = 300
