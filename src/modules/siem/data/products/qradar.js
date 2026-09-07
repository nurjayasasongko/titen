/**
 * IBM QRadar SIEM — event pipeline.
 *
 * Component names and the sub-stage lists inside the Event Collector,
 * Event Processor and Magistrate are taken from the "Event pipeline"
 * figure and the "Event collection" / "Event processing" sections of the
 * IBM QRadar Architecture and Deployment Guide.
 */
export default {
  id: 'qradar',
  name: 'IBM QRadar',
  vendor: 'IBM',
  tagline: 'Appliance pipeline. Parse on the way in, correlate in the Event Processor, own the offense on the Console.',
  bigIdea:
    'QRadar normalises everything at ingest. By the time an event reaches storage it already has a QID, a category and typed fields — so rules are written against a fixed taxonomy, not against raw text. The trade: parsing must be right at collection time, which is why DSMs and the DSM Editor matter so much.',
  docs: {
    label: 'QRadar Architecture and Deployment Guide',
    url: 'https://www.ibm.com/docs/en/SS42VS_7.5/pdf/b_siem_deployment.pdf',
  },
  zones: [
    { id: 'endpoint', label: 'Monitored host', note: 'Windows Server 2019' },
    { id: 'ec', label: 'Event Collector appliance', note: 'ecs-ec-ingress → ecs-ec' },
    { id: 'ep', label: 'Event Processor appliance', note: 'ecs-ep' },
    { id: 'console', label: 'QRadar Console', note: 'All-in-One or dedicated' },
  ],
  flow: ['log-source', 'wincollect', 'event-collector', 'event-processor', 'magistrate', 'offenses-ui'],
  edges: [
    { from: 'log-source', to: 'wincollect', label: 'EventChannel' },
    { from: 'wincollect', to: 'event-collector', label: 'syslog / TLS 6514' },
    { from: 'event-collector', to: 'event-processor', label: 'normalised events' },
    { from: 'event-processor', to: 'ariel', label: 'write', kind: 'branch' },
    { from: 'event-processor', to: 'magistrate', label: 'rule triggered' },
    { from: 'magistrate', to: 'offense-db', label: 'offense rows', kind: 'branch' },
    { from: 'magistrate', to: 'offenses-ui', label: 'offense' },
  ],
  nodes: [
    {
      id: 'log-source',
      zone: 'endpoint',
      phase: 'source',
      name: 'Log source',
      proc: 'Windows Security event log',
      icon: 'server',
      what: 'The device that produces the event. In QRadar every sender is a log source with a log source type.',
      how: 'You register it under Admin → Log Sources (Log Source Management app) and pick a log source type — here "Microsoft Windows Security Event Log". QRadar recognises a known log source by the source IP address or hostname carried in the event header. Anything it does not recognise gets pushed to the traffic analysis engine instead (see the next stage).',
      config: [
        ['Log source type', 'Microsoft Windows Security Event Log'],
        ['Protocol', 'WinCollect / Syslog / MSRPC'],
        ['Identifier', 'source IP or hostname in the header'],
      ],
      log: {
        label: 'Raw Windows event',
        code: `<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Microsoft-Windows-Security-Auditing"/>
    <EventID>4625</EventID>
    <TimeCreated SystemTime="2026-09-05T09:14:22.481Z"/>
    <Computer>WIN-APP01.corp.example.com</Computer>
    <Channel>Security</Channel>
  </System>
  <EventData>
    <Data Name="TargetUserName">j.reyes</Data>
    <Data Name="LogonType">10</Data>
    <Data Name="Status">0xC000006D</Data>
    <Data Name="SubStatus">0xC000006A</Data>
    <Data Name="IpAddress">203.0.113.47</Data>
  </EventData>
</Event>`,
      },
    },
    {
      id: 'wincollect',
      zone: 'endpoint',
      phase: 'collect',
      name: 'WinCollect agent',
      proc: 'WinCollect service',
      icon: 'upload',
      what: 'Gets the event off the Windows host and onto an Event Collector.',
      how: 'WinCollect subscribes to the Windows event channel and forwards over syslog. It runs in two shapes: managed (installed on each host, configured centrally from the Console) or standalone/gateway (one collector polling many hosts agentlessly over MSRPC or WMI). It buffers locally, so a network outage delays events rather than losing them.',
      config: [
        ['Deployment', 'managed agent, or standalone gateway'],
        ['Agentless option', 'MSRPC / WMI polling'],
        ['Destination', 'Event Collector, syslog over TLS'],
      ],
      log: {
        label: 'Forwarded, still raw',
        code: `<38>1 2026-09-05T09:14:23.104Z WIN-APP01.corp.example.com
  MSWinEventLog 4625 Microsoft-Windows-Security-Auditing
  An account failed to log on.
  Account Name: j.reyes   Domain: CORP
  Logon Type: 10          Source Network Address: 203.0.113.47
  Failure Reason: Unknown user name or bad password.`,
      },
    },
    {
      id: 'event-collector',
      zone: 'ec',
      phase: 'parse',
      name: 'Event Collector',
      proc: 'ecs-ec-ingress → ecs-ec',
      icon: 'braces',
      what: 'Where raw text becomes normalised, typed event data. This is the busiest component in QRadar.',
      how: 'Events land in input queues whose size depends on the protocol, and are parsed and normalised out of those queues. Since 7.3 the service is split in two: ecs-ec-ingress does collection, buffering and license throttling, then ecs-ec does the parsing and everything after it. Normalisation is what turns raw text into fields QRadar can use — IP address, username, and a QID that carries the event name plus its low-level and high-level category.',
      engine: {
        name: 'Event collection',
        note: 'The six functions IBM lists for the Event Collector component.',
        steps: [
          ['Protocol', 'Collects data from log source protocols such as Syslog, JDBC, OPSEC, Log File and SNMP.'],
          ['License throttling', 'Watches the incoming event rate to manage input queues and the EPS licence. Exceed it for long enough and the queue fills and events are dropped.'],
          ['Parsing', 'Takes the raw event from the source device and parses the fields into a QRadar-usable format. This is the DSM’s job; anything the DSM misses you add as a custom event property in the DSM Editor.'],
          ['Log source traffic analysis and auto discover', 'Applies the parsed and normalised data to the DSMs that support automatic discovery, so an unknown sender can be turned into a new log source automatically.'],
          ['Coalescing', 'Events are parsed and then coalesced based on common attributes across events — identical events inside a short window collapse into one record with a count.'],
          ['Event forwarding', 'Applies routing rules to forward data to offsite targets, external syslog or JSON systems, and other SIEMs.'],
        ],
      },
      config: [
        ['Parser', 'DSM + LSX, custom properties via DSM Editor'],
        ['Taxonomy', 'QID → event name + low/high level category'],
        ['Throughput unit', 'EPS (events per second) licence'],
      ],
      log: {
        label: 'Normalised event',
        code: `Log Source     : WIN-APP01 :: MS Windows Security Event Log
QID            : 5000023
Event Name     : User Login Failure
Low Level Cat  : User Login Failure
High Level Cat : Authentication
Username       : CORP\\j.reyes
Source IP      : 203.0.113.47
Destination IP : 10.20.4.31
Event Count    : 1        (coalesced records carry more)`,
      },
    },
    {
      id: 'event-processor',
      zone: 'ep',
      phase: 'correlate',
      name: 'Event Processor',
      proc: 'ecs-ep',
      icon: 'git-merge',
      what: 'Runs your rules against every normalised event, and stores the events.',
      how: 'The Event Collector hands normalised events to the Event Processor, where the Custom Rules Engine compares them against the rules defined on the Console. When an event matches, the Event Processor executes the rule response and sends a notification onward to the Magistrate. Correlation lives here — the CRE is stateful, tracking systems involved in incidents over time, which is what lets "8 failures in 5 minutes" be a rule at all.',
      engine: {
        name: 'Event processing',
        note: 'The three functions IBM lists for the Event Processor component.',
        steps: [
          ['Custom Rules Engine (CRE)', 'Processes received events and compares them against defined rules, keeps track of systems involved in incidents over time, and generates notifications. On a match the Event Processor tells the Magistrate a rule fired.'],
          ['Streaming', 'Sends real-time event data to the Console when someone is watching the Log Activity tab in streaming mode. Streamed events do not come from the database.'],
          ['Event storage (Ariel)', 'A time-series database for events, stored minute by minute, on the appliance where the event was processed.'],
        ],
      },
      config: [
        ['Rules', 'Rule Wizard: tests + reusable building blocks'],
        ['Example rule', '"Multiple Login Failures for Single Username"'],
        ['Responses', 'new event, offense, email, SNMP, reference set'],
      ],
      log: {
        label: 'CRE match',
        code: `RULE MATCH  (Custom Rules Engine)
  rule       : Multiple Login Failures for Single Username
  tests      : event matches Authentication : User Login Failure
               AND at least 8 events in 5 minutes
               with the same Username
  observed   : 11 events  09:14:22 → 09:16:58
  username   : CORP\\j.reyes
  response   : dispatch new event + notify Magistrate`,
      },
    },
    {
      id: 'ariel',
      zone: 'ep',
      phase: 'store',
      name: 'Ariel',
      proc: '/store/ariel',
      icon: 'database',
      what: 'The event and flow store — a time-series database written minute by minute.',
      how: 'Data is stored on the appliance where the event was processed, which is why adding Event Processors adds both processing and storage. You query it with AQL from the Log Activity tab. Data Nodes can be attached to spread that storage and search load.',
      config: [
        ['Type', 'time-series, minute-by-minute buckets'],
        ['Query language', 'AQL (Ariel Query Language)'],
        ['Scale-out', 'Data Nodes'],
      ],
      log: {
        label: 'Retrieval',
        code: `SELECT QIDNAME(qid) AS event, username, sourceip, COUNT(*)
FROM events
WHERE qid = 5000023
  AND username = 'CORP\\j.reyes'
  LAST 15 MINUTES
GROUP BY username, sourceip`,
      },
    },
    {
      id: 'magistrate',
      zone: 'console',
      phase: 'correlate',
      name: 'Magistrate (MPC)',
      proc: 'Magistrate Processing Core',
      icon: 'gavel',
      what: 'Creates and manages offenses. Only the Console or an All-in-One has one.',
      how: 'The Magistrate Processing Core correlates offenses with the event notifications arriving from every Event Processor in the deployment — that central position is why it only runs on the Console. It decides whether a rule hit opens a new offense or attaches to an existing one, based on the offense index field (here the username).',
      engine: {
        name: 'Magistrate',
        note: 'The three functions IBM lists for the Magistrate component.',
        steps: [
          ['Offense rules', 'Monitors and acts on offenses — for example generating email notifications.'],
          ['Offense management', 'Updates active offenses, changes their status, and serves offense information to the Offenses tab.'],
          ['Offense storage', 'Writes offense data to a Postgres database.'],
        ],
      },
      config: [
        ['Indexed on', 'the offense index field, e.g. Username'],
        ['Magnitude', 'derived from severity, credibility and relevance'],
        ['Runs on', 'Console / All-in-One only'],
      ],
      log: {
        label: 'Offense created',
        code: `OFFENSE 4471
  Description  : Multiple Login Failures for Single Username
  Offense Type : Username
  Offense Src  : CORP\\j.reyes
  Magnitude    : 7    (severity 8 / credibility 6 / relevance 7)
  Events       : 11        Flows: 0
  Start        : 2026-09-05 09:14:22
  Status       : Active, unassigned`,
      },
    },
    {
      id: 'offense-db',
      zone: 'console',
      phase: 'store',
      name: 'Offense database',
      proc: 'PostgreSQL',
      icon: 'database',
      what: 'Offense records live in Postgres, separate from the events in Ariel.',
      how: 'Two stores, two jobs: Ariel holds the high-volume event data on the processors, Postgres holds the comparatively tiny set of offense records and their state on the Console. An offense keeps pointers to its contributing events rather than copying them.',
      config: [
        ['Holds', 'offense records, status, assignment, notes'],
        ['Does not hold', 'the events themselves — those stay in Ariel'],
      ],
      log: {
        label: 'What is kept',
        code: `offense_id   4471
index_field  username = CORP\\j.reyes
magnitude    7
status       ACTIVE
assigned_to  NULL
event_count  11   -> resolved back to Ariel on drill-down`,
      },
    },
    {
      id: 'offenses-ui',
      zone: 'console',
      phase: 'present',
      name: 'Offenses tab',
      proc: 'Console UI',
      icon: 'bell',
      what: 'Where the analyst picks the work up.',
      how: 'Offenses are listed by magnitude so the queue self-sorts. From an offense you drill into its contributing events (fetched from Ariel via AQL), see the offense source and destinations, assign it, and close it with a reason. Log Activity is the free-form search view next to it.',
      config: [
        ['Analyst views', 'Offenses tab, Log Activity, Network Activity'],
        ['Triage', 'assign, add notes, close with reason'],
      ],
      log: {
        label: 'What the analyst sees',
        code: `Offenses ▸ All Offenses
  ID    Magnitude  Description                              Src            Events
  4471  ███████ 7  Multiple Login Failures for Single User…  CORP\\j.reyes   11
  4470  ████ 4     Excessive Firewall Denies                 10.20.9.7      338`,
      },
    },
  ],
}
