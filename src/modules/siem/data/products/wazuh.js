/**
 * Wazuh 4.x.
 *
 * Daemon names and one-line roles come from the Wazuh daemon reference;
 * the pre-decoding / decoding / rule matching phases come from the
 * "Log data analysis" page in the Wazuh user manual.
 */
export default {
  id: 'wazuh',
  name: 'Wazuh',
  vendor: 'Wazuh (open source)',
  tagline: 'One analysis daemon does the whole brain: decode, match, alert. Everything else is transport and storage.',
  bigIdea:
    'Wazuh splits cleanly into daemons you can watch individually. wazuh-analysisd is the entire analysis engine — pre-decoding, decoding, rule matching and alerting happen inside one process, in that fixed order. If a log is not alerting, you can bisect it exactly: run it through wazuh-logtest and see which phase drops it.',
  docs: {
    label: 'Wazuh documentation — daemons and log data analysis',
    url: 'https://documentation.wazuh.com/current/user-manual/reference/daemons/index.html',
  },
  zones: [
    { id: 'endpoint', label: 'Endpoint', note: 'Wazuh agent' },
    { id: 'server', label: 'Wazuh server', note: 'the manager' },
    { id: 'indexing', label: 'Indexing', note: 'Filebeat → Wazuh indexer' },
    { id: 'ui', label: 'Presentation', note: 'Wazuh dashboard' },
  ],
  flow: ['logcollector', 'agentd', 'remoted', 'analysisd', 'alerts', 'filebeat', 'indexer', 'dashboard'],
  edges: [
    { from: 'logcollector', to: 'agentd', label: 'internal queue' },
    { from: 'agentd', to: 'remoted', label: '1514/TCP, AES' },
    { from: 'remoted', to: 'analysisd', label: 'analysis queue' },
    { from: 'analysisd', to: 'execd', label: 'active response', kind: 'branch' },
    { from: 'analysisd', to: 'alerts', label: 'level ≥ 3' },
    { from: 'alerts', to: 'filebeat', label: 'tail' },
    { from: 'filebeat', to: 'indexer', label: 'TLS 9200' },
    { from: 'indexer', to: 'dashboard', label: 'query' },
  ],
  nodes: [
    {
      id: 'logcollector',
      zone: 'endpoint',
      phase: 'source',
      name: 'wazuh-logcollector',
      proc: 'agent daemon',
      icon: 'server',
      what: 'Monitors configured files and commands for new log messages.',
      how: 'On Windows it does not tail a file — it subscribes to the Windows event channel directly with log_format eventchannel, and hands the event over as JSON. The same daemon also reads flat files, Windows eventlog, and the stdout of commands you configure it to run on an interval.',
      config: [
        ['ossec.conf', '<localfile><location>Security</location>'],
        ['', '<log_format>eventchannel</log_format></localfile>'],
        ['Also collects', 'files, command output, Windows eventlog'],
      ],
      log: {
        label: 'Event as the agent sees it',
        code: `{"win":{"system":{
    "providerName":"Microsoft-Windows-Security-Auditing",
    "eventID":"4625",
    "channel":"Security",
    "computer":"WIN-APP01.corp.example.com",
    "systemTime":"2026-09-05T09:14:22.481Z"},
  "eventdata":{
    "targetUserName":"j.reyes",
    "logonType":"10",
    "ipAddress":"203.0.113.47",
    "subStatus":"0xc000006a"}}}`,
      },
    },
    {
      id: 'agentd',
      zone: 'endpoint',
      phase: 'collect',
      name: 'wazuh-agentd',
      proc: 'agent daemon',
      icon: 'upload',
      what: 'Client-side daemon that communicates with the server.',
      how: 'Everything the agent modules produce — logcollector events, syscheck FIM changes, syscollector inventory, SCA results — funnels through agentd and out over one keyed, encrypted channel. Enrolment happens first: the agent registers and receives a key, which is how the manager attributes every message to an agent ID. AES with 128-bit blocks and 256-bit keys by default; Blowfish is the legacy option.',
      config: [
        ['Transport', '1514/TCP by default (UDP optional, off by default)'],
        ['Encryption', 'AES 128-bit blocks / 256-bit keys'],
        ['Enrolment', 'agent key in client.keys'],
        ['Sibling modules', 'syscheckd (FIM), modulesd, execd'],
      ],
      log: {
        label: 'On the wire',
        code: `agent id  : 004
agent name: WIN-APP01
agent ip  : 10.20.4.31
queue     : EventChannel
payload   : <encrypted>  ->  wazuh-manager:1514/tcp`,
      },
    },
    {
      id: 'remoted',
      zone: 'server',
      phase: 'collect',
      name: 'wazuh-remoted',
      proc: 'manager daemon',
      icon: 'inbox',
      what: 'Communicates with agents.',
      how: 'remoted terminates every agent connection, verifies and decrypts the message using that agent’s key, and drops the plaintext event onto the internal analysis queue. It is also the daemon that pushes shared configuration and ruleset updates back down to agent groups. If agents show as disconnected, remoted is where you look first.',
      config: [
        ['Listens', '1514/TCP (agents), 1515/TCP (enrolment, authd)'],
        ['Hands off to', 'wazuh-analysisd via the analysis queue'],
        ['Also does', 'shared config push to agent groups'],
      ],
      log: {
        label: 'Decrypted and queued',
        code: `2026/09/05 09:14:23 wazuh-remoted: agent 004 (WIN-APP01)
  msg decrypted ok, queued -> /var/ossec/queue/sockets/queue

# ossec.log is where you confirm the event actually arrived`,
      },
    },
    {
      id: 'analysisd',
      zone: 'server',
      phase: 'correlate',
      name: 'wazuh-analysisd',
      proc: 'manager daemon',
      icon: 'braces',
      what: 'Receives log messages and compares them to the rules. This is the whole analysis engine.',
      how: 'Every collected log flows through analysisd, in a fixed four-phase order. Parsing and correlation are not separate components here the way they are in QRadar or Splunk — they are consecutive phases inside one process. You can replay any log through exactly these phases with /var/ossec/bin/wazuh-logtest, which is the single most useful debugging tool in Wazuh.',
      engine: {
        name: 'Analysis engine',
        note: 'Fixed order. A log dropped in an early phase never reaches the later ones.',
        steps: [
          ['Pre-decoding', 'Extracts syslog-like header information — timestamp, hostname, program name — when such a header is present. JSON events like the Windows eventchannel skip most of this.'],
          ['Decoding', 'Decoders parse the remaining data into named fields. A parent decoder matches on the program name or a JSON structure, child decoders extract the values: targetUserName, ipAddress, logonType.'],
          ['Rule matching', 'The decoded fields are compared against the ruleset. Rules carry a level (0–16) and a description; sibling rules use if_sid / if_matched_sid, and frequency + timeframe turn N single events into one composite match.'],
          ['Alerting', 'Rules at or above the alert level (3 by default) are written out as alerts. Below that, the match is evaluated but produces no alert.'],
        ],
      },
      config: [
        ['Decoders', '/var/ossec/ruleset/decoders/ (+ etc/decoders for custom)'],
        ['Rules', '/var/ossec/ruleset/rules/ (+ etc/rules for custom)'],
        ['Correlation', '<frequency>, <timeframe>, <if_matched_sid>, <same_srcip>'],
        ['Debug with', '/var/ossec/bin/wazuh-logtest'],
      ],
      log: {
        label: 'wazuh-logtest output',
        code: `**Phase 1: Completed pre-decoding.
**Phase 2: Completed decoding.
    name: 'windows_eventchannel'
    win.eventdata.targetUserName: 'j.reyes'
    win.eventdata.ipAddress: '203.0.113.47'
**Phase 3: Completed filtering (rules).
    id: '60122'   level: '5'
    description: 'Logon Failure - Unknown user or bad password'
    -> composite rule fires after 8 in 120s
       level: '10'  'Multiple Windows logon failures'`,
      },
    },
    {
      id: 'execd',
      zone: 'server',
      phase: 'correlate',
      name: 'wazuh-execd',
      proc: 'manager + agent',
      icon: 'zap',
      what: 'Executes active responses.',
      how: 'A rule can trigger a command instead of just an alert — block the source IP with the host-deny or firewall-drop script, disable an account, run something custom. execd runs on the manager to dispatch it and on the agent to actually perform it. Responses are usually time-boxed with a timeout so a false positive does not lock someone out permanently.',
      config: [
        ['Configured in', '<active-response> in ossec.conf'],
        ['Triggers on', 'rule id or rule level'],
        ['Stock scripts', 'firewall-drop, host-deny, disable-account'],
      ],
      log: {
        label: 'Active response',
        code: `<active-response>
  <command>firewall-drop</command>
  <location>local</location>
  <rules_id>60204</rules_id>
  <timeout>600</timeout>
</active-response>

-> drops 203.0.113.47 on WIN-APP01 for 10 minutes`,
      },
    },
    {
      id: 'alerts',
      zone: 'server',
      phase: 'store',
      name: 'Alert files',
      proc: '/var/ossec/logs/alerts/',
      icon: 'archive',
      what: 'Alerts are written to disk on the manager before anything ships them anywhere.',
      how: 'Two formats side by side: alerts.log is human-readable for tailing on the box, alerts.json is the machine-readable one Filebeat picks up. This file is the ground truth — if an alert is missing from the dashboard, check whether it is here first, because that tells you instantly whether the problem is analysis or shipping.',
      config: [
        ['alerts.json', 'machine-readable, read by Filebeat'],
        ['alerts.log', 'human-readable, for tail -f on the manager'],
        ['Threshold', '<log_alert_level> in ossec.conf, default 3'],
      ],
      log: {
        label: 'alerts.json',
        code: `{
  "timestamp": "2026-09-05T09:16:58.220+0000",
  "rule": {
    "level": 10,
    "description": "Multiple Windows logon failures",
    "id": "60204",
    "frequency": 8,
    "groups": ["windows","authentication_failures"],
    "mitre": { "id": ["T1110"], "technique": ["Brute Force"] }
  },
  "agent": { "id": "004", "name": "WIN-APP01" },
  "data": { "win": { "eventdata": {
      "targetUserName": "j.reyes",
      "ipAddress": "203.0.113.47" } } }
}`,
      },
    },
    {
      id: 'filebeat',
      zone: 'indexing',
      phase: 'collect',
      name: 'Filebeat',
      proc: 'wazuh module',
      icon: 'upload',
      what: 'Tails alerts.json and ships it to the Wazuh indexer over TLS.',
      how: 'Filebeat runs on the manager with the Wazuh module enabled, which supplies the index template and the ingest pipeline. It is a plain log shipper — it does no analysis. Because it tracks its read position, a manager that cannot reach the indexer will catch up once the link is back rather than losing alerts.',
      config: [
        ['Module', 'wazuh module for Filebeat'],
        ['Output', 'Wazuh indexer, TLS, 9200/TCP'],
        ['Template', 'wazuh index template + ingest pipeline'],
      ],
      log: {
        label: 'Shipping',
        code: `filebeat  input   /var/ossec/logs/alerts/alerts.json
          output  https://wazuh-indexer:9200
          index   wazuh-alerts-4.x-2026.09.05

# offset tracked in the registry: no gaps after an outage`,
      },
    },
    {
      id: 'indexer',
      zone: 'indexing',
      phase: 'store',
      name: 'Wazuh indexer',
      proc: 'OpenSearch fork',
      icon: 'database',
      what: 'Stores and indexes the alerts so the dashboard can search them.',
      how: 'A fork of OpenSearch, so everything you know about indices, shards and index state management applies. Alerts land in daily wazuh-alerts-4.x-* indices; other Wazuh data (monitoring, statistics, vulnerability state) gets its own index patterns. Retention is managed with ISM policies rather than anything Wazuh-specific.',
      config: [
        ['Alert index', 'wazuh-alerts-4.x-YYYY.MM.DD'],
        ['Engine', 'OpenSearch (indices, shards, ISM)'],
        ['Access', 'HTTPS 9200, certificate-based'],
      ],
      log: {
        label: 'Query it directly',
        code: `GET wazuh-alerts-4.x-*/_search
{ "query": { "bool": { "must": [
    { "match": { "rule.id": "60204" } },
    { "match": { "agent.name": "WIN-APP01" } }
] } } }`,
      },
    },
    {
      id: 'dashboard',
      zone: 'ui',
      phase: 'present',
      name: 'Wazuh dashboard',
      proc: 'OpenSearch Dashboards fork',
      icon: 'bell',
      what: 'Where the analyst reads the alert and pivots from it.',
      how: 'The dashboard queries the indexer for alert data and the Wazuh server API on 55000 for agent state and configuration — two different backends behind one UI, which is worth knowing when half the page loads and half does not. Threat Hunting is the general alert view; the MITRE ATT&CK module pivots the same alerts by technique.',
      config: [
        ['Reads alerts from', 'Wazuh indexer (HTTPS)'],
        ['Reads agent state from', 'Wazuh server API, 55000/TCP'],
        ['Views', 'Threat Hunting, MITRE ATT&CK, per-agent'],
      ],
      log: {
        label: 'What the analyst sees',
        code: `Modules ▸ Security events ▸ WIN-APP01
  Time      Rule  Level  Description                        Agent
  09:16:58  60204   10   Multiple Windows logon failures    WIN-APP01
  09:16:41  60122    5    Logon Failure - Unknown user…     WIN-APP01
  09:16:22  60122    5    Logon Failure - Unknown user…     WIN-APP01`,
      },
    },
  ],
}
