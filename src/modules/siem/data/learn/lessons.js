/**
 * Level 1: the concepts, with no product names in them at all.
 *
 * Each lesson pairs one interactive visual with the plain-language idea it
 * demonstrates, the mistake beginners make, and where that same idea shows
 * up in the three real products (level 2).
 */
export const lessons = [
  {
    id: 'why',
    number: 1,
    title: 'Why a SIEM exists',
    question: 'Every machine already writes its own logs. Why add another system?',
    idea: [
      'A company has hundreds of machines, and each one keeps its own diary in its own handwriting. A Windows server, a Linux box and a firewall all describe "someone failed to log in" in three completely different sentences, stored in three different places.',
      'That is fine until you need to answer one question: "did this attacker touch anything else?" Answering it means opening every diary by hand, on every machine, in a language specific to that machine — while the attacker keeps working.',
      'A SIEM is the room where every diary is copied to, rewritten in one shared language, and read continuously by a machine that never gets tired.',
    ],
    takeaway: 'A SIEM does not create new information. It centralises it, translates it into one vocabulary, and watches it non-stop.',
    gotcha:
      'Turning on a SIEM does not make you secure. If a machine is not sending its logs, the SIEM is blind to it — and it will not tell you it is blind. "No alerts" and "no data" look identical on a dashboard.',
    productMap: null,
  },
  {
    id: 'collect',
    number: 2,
    title: 'Collection — getting the log out of the machine',
    question: 'How does a log line physically get from a server to the SIEM?',
    idea: [
      'Something has to carry each log line across the network. Usually that is a small program installed on the machine — an agent — that reads the log as it is written and sends it onward over an encrypted connection.',
      'The network is not always up, so the agent keeps a buffer: if the SIEM is unreachable, it stores what it cannot send and flushes it once the link returns. That is the difference between "delayed" and "lost".',
      'The event has not been understood yet at this point. It is still the original text, wrapped in a little envelope saying which host it came from and when it arrived.',
    ],
    takeaway: 'Collection moves the log. It does not interpret it. Everything is still raw text here.',
    gotcha:
      'The buffer has a size limit. A long outage, or a machine that suddenly logs 100× more than usual, will overflow it and the oldest events are dropped silently. Volume spikes lose data just as effectively as outages do.',
    productMap: {
      label: 'Who does this in a real SIEM',
      qradar: ['WinCollect agent', 'wincollect'],
      splunk: ['Universal Forwarder — the input segment', 'input'],
      wazuh: ['wazuh-agentd → wazuh-remoted', 'agentd'],
    },
  },
  {
    id: 'parse',
    number: 3,
    title: 'Parsing and normalisation — teaching the machine to read',
    question: 'The SIEM has the text. Why can it not just search the text?',
    idea: [
      'You can search raw text, but you cannot reason about it. "203.0.113.47" is only a source IP address if something has decided that it is one — otherwise it is fifteen characters that happen to look like a number.',
      'Parsing pulls the meaningful pieces out of the raw line and puts them into named slots: who, from where, doing what, with what result. Normalisation is the second half: making sure every log source fills in the same slots with the same names.',
      'That second half is the whole point. Once a Windows failed logon and a Linux failed SSH login both produce action=failure, you can write one rule that catches both — instead of one rule per product per log format.',
    ],
    takeaway:
      'Parsing = raw text into named fields. Normalisation = every source using the same field names. Rules are written against the fields, never against the raw text.',
    gotcha:
      'If a parser is wrong or missing, the event still arrives and still gets stored — it just has empty fields. Every rule that depends on those fields silently does nothing. This is the single most common reason a SIEM "misses" an attack it was configured to catch.',
    productMap: {
      label: 'Who does this in a real SIEM',
      qradar: ['DSM inside ecs-ec, at ingest', 'event-collector'],
      splunk: ['props.conf + CIM, at search time', 'search'],
      wazuh: ['Decoders inside wazuh-analysisd', 'analysisd'],
    },
  },
  {
    id: 'correlate',
    number: 4,
    title: 'Correlation — one event means nothing',
    question: 'Someone failed to log in. Is that an attack?',
    idea: [
      'No. People mistype passwords constantly. If you alert on every failed login, you generate hundreds of alerts a day, analysts learn to ignore them, and the real attack arrives inside that noise.',
      'What matters is the pattern: how many, how fast, from where, against whom. "One failure" is normal. "Eleven failures against one account from one IP address in two minutes" is not — the same events, but arranged in a shape that human behaviour rarely produces.',
      'So the correlation engine holds recent events in memory and continuously asks: inside the last N minutes, does any group of events cross a threshold? That memory is what makes it different from a search — it is watching time pass, not looking at a snapshot.',
    ],
    takeaway:
      'A rule is three things: a filter (which events count), a window (how far back to look), and a threshold (how many is too many). Change any one and the alert volume changes completely.',
    gotcha:
      'Thresholds are a trade-off you cannot escape. Set it low and you drown in false positives; set it high and a slow attacker who tries three passwords an hour walks straight under it. Tuning is not a one-time setup task — it is the job.',
    productMap: {
      label: 'Who does this in a real SIEM',
      qradar: ['Custom Rules Engine in ecs-ep', 'event-processor'],
      splunk: ['Correlation search in Enterprise Security', 'correlation'],
      wazuh: ['Composite rules in wazuh-analysisd', 'analysisd'],
    },
  },
  {
    id: 'alert',
    number: 5,
    title: 'Alerting and triage — turning a match into work',
    question: 'The rule fired. Why is it not just "an alert"?',
    idea: [
      'A rule match is a fact: this pattern occurred. An alert is a decision: a human should look at this, and in what order relative to everything else waiting.',
      'The same rule firing is not equally urgent everywhere. Eleven failed logins against a test laptop and eleven against the domain controller are the same pattern with completely different consequences. So urgency is usually the rule severity combined with how important the affected machine or account is.',
      'From there it becomes queue work: the alert has an owner, a status, the evidence attached, and eventually a verdict — real incident, or false positive that should be tuned away so it never interrupts anyone again.',
    ],
    takeaway:
      'Severity is a property of the rule. Urgency is severity combined with what was hit. That combination is what sorts your queue.',
    gotcha:
      'Closing an alert as a false positive without changing the rule guarantees you will close it again tomorrow. An untuned queue trains analysts to click "close" reflexively, which is how a real detection gets closed at 3am.',
    productMap: {
      label: 'Who does this in a real SIEM',
      qradar: ['Magistrate creates an offense', 'magistrate'],
      splunk: ['Notable event in Incident Review', 'incident-review'],
      wazuh: ['Alert with a rule level, in the dashboard', 'dashboard'],
    },
  },
]
