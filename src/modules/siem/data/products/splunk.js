/**
 * Splunk Enterprise + Enterprise Security.
 *
 * The four pipeline segments and what happens inside each are taken from
 * Splunk's "How data moves through Splunk deployments: the data pipeline"
 * doc; the queue names are the splunkd processing queues.
 */
export default {
  id: 'splunk',
  name: 'Splunk',
  vendor: 'Splunk (Cisco)',
  tagline: 'Index the raw text now, decide what the fields mean at search time.',
  bigIdea:
    'Splunk is schema-on-read. The indexer keeps the original event almost verbatim and only extracts a few things at index time; field extraction and CIM normalisation happen when you search. That means you can fix a bad parser retroactively — and it means correlation runs as scheduled searches, not as a live rule engine.',
  docs: {
    label: 'How data moves through Splunk deployments: the data pipeline',
    url: 'https://help.splunk.com/en/splunk-enterprise/administer/distributed-deployment-manual/10.0/overview-of-splunk-enterprise-distributed-deployments/how-data-moves-through-splunk-deployments-the-data-pipeline',
  },
  zones: [
    { id: 'endpoint', label: 'Data source tier', note: 'Windows Server 2019' },
    { id: 'indexing', label: 'Indexing tier', note: 'splunkd on the indexer' },
    { id: 'search', label: 'Search management tier', note: 'search head' },
    { id: 'es', label: 'Enterprise Security', note: 'app on the search head' },
  ],
  flow: ['input', 'parsing', 'indexing', 'search', 'correlation', 'incident-review'],
  edges: [
    { from: 'input', to: 'parsing', label: 'splunktcp 9997' },
    { from: 'parsing', to: 'indexing', label: 'indexQueue' },
    { from: 'indexing', to: 'buckets', label: 'write', kind: 'branch' },
    { from: 'indexing', to: 'search', label: 'searchable' },
    { from: 'search', to: 'correlation', label: 'CIM data model' },
    { from: 'correlation', to: 'risk-index', label: 'risk modifier', kind: 'branch' },
    { from: 'correlation', to: 'incident-review', label: 'notable event' },
  ],
  nodes: [
    {
      id: 'input',
      zone: 'endpoint',
      phase: 'collect',
      name: 'Input segment',
      proc: 'Universal Forwarder (splunkd)',
      icon: 'upload',
      what: 'Acquires the raw stream and labels it. No event-level processing happens yet.',
      how: 'The forwarder acquires the raw data stream from its source, breaks it into 64KB blocks, and annotates each block with metadata keys. At this point Splunk has no idea where one event ends and the next begins — the keys are source-wide properties, applied to the whole stream rather than to individual events. A Universal Forwarder does only this and ships onward; a Heavy Forwarder can also run the parsing segment locally.',
      engine: {
        name: 'Input segment',
        note: 'What the forwarder does before anything is an "event".',
        steps: [
          ['Acquire the raw stream', 'inputs.conf defines the source. For Windows, the Splunk Add-on for Microsoft Windows defines an event log input on the Security channel.'],
          ['Break into 64KB blocks', 'The stream is chunked for transport, not split into events.'],
          ['Annotate with metadata keys', 'host, source, sourcetype and the target index are attached to the whole stream.'],
        ],
      },
      config: [
        ['inputs.conf', '[WinEventLog://Security]'],
        ['sourcetype', 'WinEventLog:Security (or XmlWinEventLog:Security)'],
        ['outputs.conf', 'indexer group, splunktcp 9997'],
      ],
      log: {
        label: 'Stream + metadata keys',
        code: `host       = WIN-APP01
source     = WinEventLog:Security
sourcetype = WinEventLog:Security
index      = wineventlog

<64KB block of raw text — event boundaries not yet known>
  09/05/2026 09:14:22 AM
  LogName=Security
  EventCode=4625 ...`,
      },
    },
    {
      id: 'parsing',
      zone: 'indexing',
      phase: 'parse',
      name: 'Parsing segment',
      proc: 'splunkd pipelines',
      icon: 'braces',
      what: 'Turns the byte stream into individual, timestamped events.',
      how: 'The indexer runs this segment (unless a heavy forwarder did it first). What looks like one step is really three pipelines chained by queues — parsing, merging and typing — and every Splunk performance conversation about "blocked queues" is about this chain backing up. Note what is NOT here: most field extraction. That is deferred to search time.',
      engine: {
        name: 'Parsing pipeline',
        note: 'The splunkd queues, in order.',
        steps: [
          ['parsingQueue', 'Character-set handling (UTF-8), line breaking via LINE_BREAKER, and header recognition. Breaks the stream into lines.'],
          ['aggQueue (merging)', 'Puts multi-line events back together — SHOULD_LINEMERGE, BREAK_ONLY_BEFORE, MUST_BREAK_AFTER — and identifies, parses and sets the timestamp into _time.'],
          ['typingQueue', 'Applies regex transforms: SEDCMD masking, index-time field extraction, and routing or filtering rules from transforms.conf.'],
          ['indexQueue', 'Holds fully parsed events waiting for the indexing pipeline.'],
        ],
      },
      config: [
        ['props.conf', 'LINE_BREAKER, SHOULD_LINEMERGE, TIME_PREFIX, TIME_FORMAT'],
        ['transforms.conf', 'index-time extraction, routing, masking'],
        ['Runs on', 'indexer — or heavy forwarder, if you have one'],
      ],
      log: {
        label: 'One discrete event',
        code: `_time      = 2026-09-05T09:14:22.481Z
_raw       = 09/05/2026 09:14:22 AM
             LogName=Security
             EventCode=4625
             Message=An account failed to log on.
             Account Name: j.reyes
             Logon Type: 10
             Source Network Address: 203.0.113.47

# metadata carried through; fields NOT extracted yet`,
      },
    },
    {
      id: 'indexing',
      zone: 'indexing',
      phase: 'store',
      name: 'Indexing segment',
      proc: 'splunkd indexer',
      icon: 'database',
      what: 'Writes the parsed events to disk and builds the index that makes them findable.',
      how: 'Two artefacts get written per bucket: the compressed rawdata journal, which is the event text itself, and .tsidx index files, which map terms to positions in that journal. Splunk searches the tsidx to find candidate events, then pulls the raw text back out. This is why raw data survives a bad parser and why you can re-extract fields later.',
      config: [
        ['Writes', 'rawdata journal.gz + .tsidx files'],
        ['Bucket lifecycle', 'hot → warm → cold → frozen'],
        ['Replication', 'index clustering, replication + search factor'],
      ],
      log: {
        label: 'On disk',
        code: `$SPLUNK_DB/wineventlog/db/
  hot_v1_412/
    rawdata/journal.gz         <- the event text, compressed
    1757063662-1757062800-*.tsidx   <- term -> offset index
    Sources.data  Hosts.data  SourceTypes.data`,
      },
    },
    {
      id: 'buckets',
      zone: 'indexing',
      phase: 'store',
      name: 'Index buckets',
      proc: '$SPLUNK_DB',
      icon: 'archive',
      what: 'Time-bounded directories that age out through hot, warm, cold and frozen.',
      how: 'Every bucket covers a time range, which is why time is the cheapest filter in any Splunk search — it eliminates whole buckets before reading anything. Retention is set per index by size and age; frozen means deleted unless you configure an archive path.',
      config: [
        ['indexes.conf', 'maxDataSize, frozenTimePeriodInSecs'],
        ['Search cost', 'narrow the time range first, always'],
      ],
      log: {
        label: 'Why time filters are cheap',
        code: `index=wineventlog earliest=-15m
  -> touches 1 hot bucket

index=wineventlog earliest=-90d
  -> touches ~180 warm/cold buckets`,
      },
    },
    {
      id: 'search',
      zone: 'search',
      phase: 'parse',
      name: 'Search segment',
      proc: 'Search head',
      icon: 'search',
      what: 'Where fields actually get extracted and normalised — at query time, on every search.',
      how: 'Schema-on-read: props.conf and transforms.conf extraction rules run against the raw text as results come back. The Splunk Add-on for Microsoft Windows then maps those fields onto the Common Information Model, so a Windows 4625 and a Linux sshd failure both become Authentication.action="failure" with user, src and dest. Accelerating the data model builds tsidx summaries so tstats can query it fast — which is what ES correlation searches rely on.',
      engine: {
        name: 'Search-time normalisation',
        steps: [
          ['Field extraction', 'EXTRACT- and REPORT- stanzas in props.conf pull user, src, dest out of _raw.'],
          ['CIM mapping', 'Add-on eventtypes and tags map the sourcetype into the Authentication data model.'],
          ['Data model acceleration', 'Builds summary tsidx so |tstats over Authentication returns in seconds instead of minutes.'],
        ],
      },
      config: [
        ['Data model', 'Authentication (CIM)'],
        ['Key fields', 'action, user, src, dest, app, signature_id'],
        ['Fast path', '| tstats ... from datamodel=Authentication'],
      ],
      log: {
        label: 'CIM-normalised result',
        code: `action       = failure
user         = j.reyes
src          = 203.0.113.47
dest         = WIN-APP01
app          = win:remote
signature    = An account failed to log on
signature_id = 4625

# same field names a Linux sshd failure would produce`,
      },
    },
    {
      id: 'correlation',
      zone: 'es',
      phase: 'correlate',
      name: 'Correlation search',
      proc: 'Enterprise Security',
      icon: 'git-merge',
      what: 'A scheduled search with a threshold — not a streaming rule engine.',
      how: 'ES correlation searches run on a schedule (commonly every 5 minutes over a 60-minute window) against the accelerated data models. When results come back, adaptive response actions fire: create a notable event, apply a risk modifier, send an email, run a script. With risk-based alerting the search does not alert at all — it writes a risk event to the risk index, and a separate risk incident rule alerts only once accumulated risk crosses a threshold.',
      engine: {
        name: 'Correlation search',
        steps: [
          ['Search logic (SPL)', 'Usually tstats over an accelerated data model, with a threshold in the where clause.'],
          ['Schedule + window', 'Cron schedule plus earliest/latest. Overlap the window or you will miss events at the seam.'],
          ['Adaptive response actions', 'Create notable, risk modifier, email, ping, run script, or a custom action from an add-on.'],
        ],
      },
      config: [
        ['Example', 'Access - Excessive Failed Logins - Rule'],
        ['Schedule', 'every 5 min, window -60m'],
        ['Responses', 'notable event and/or risk modifier'],
      ],
      log: {
        label: 'The search itself',
        code: `| tstats summariesonly=t count
    from datamodel=Authentication
    where Authentication.action="failure"
    by Authentication.user, Authentication.src, _time span=5m
| \`drop_dm_object_name("Authentication")\`
| where count >= 8

  -> 1 result: user=j.reyes src=203.0.113.47 count=11
  -> adaptive response: create notable`,
      },
    },
    {
      id: 'risk-index',
      zone: 'es',
      phase: 'store',
      name: 'Risk index',
      proc: 'index=risk',
      icon: 'archive',
      what: 'The risk-based alerting path: score the object instead of alerting on it.',
      how: 'A risk rule writes a risk event carrying a risk_object (the user or host), a risk_score and the MITRE annotation, rather than raising an alert. Individually these are low-fidelity signals; a risk incident rule watches the accumulated score per object and raises one risk notable when it crosses the line. Eight failed logins alone stay quiet — eight failed logins plus a new-country login plus a suspicious process do not.',
      config: [
        ['Fields', 'risk_object, risk_object_type, risk_score'],
        ['Alerting', 'risk incident rule on accumulated score'],
      ],
      log: {
        label: 'Risk event',
        code: `risk_object      = j.reyes
risk_object_type = user
risk_score       = 20
search_name      = Access - Excessive Failed Logins - Rule
annotations.mitre_attack = T1110.001

# 24h total for j.reyes now 85 — threshold 100`,
      },
    },
    {
      id: 'incident-review',
      zone: 'es',
      phase: 'present',
      name: 'Incident Review',
      proc: 'notable index',
      icon: 'bell',
      what: 'The analyst queue: notable events with urgency, owner and status.',
      how: 'A notable is an event in the notable index with extra metadata for triage. Urgency is computed from the correlation search severity combined with the priority of the asset or identity involved — so the same rule firing on a domain controller outranks it firing on a test VM. Analysts assign, change status, and pivot through the drill-down search back to the contributing raw events.',
      config: [
        ['Urgency', 'rule severity × asset/identity priority'],
        ['Status', 'New → In Progress → Pending → Resolved → Closed'],
        ['Pivot', 'drill-down search back to raw events'],
      ],
      log: {
        label: 'Notable event',
        code: `NOTABLE
  search_name : Access - Excessive Failed Logins - Rule
  urgency     : high
  status      : New          owner: unassigned
  user        : j.reyes      src: 203.0.113.47
  count       : 11
  drilldown   : index=wineventlog EventCode=4625 user=j.reyes`,
      },
    },
  ],
}
