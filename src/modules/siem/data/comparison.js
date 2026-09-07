/**
 * Same job, three sets of names. This is the table analysts actually want
 * pinned to the wall when they move between products.
 */
export const comparison = [
  {
    phase: 'collect',
    job: 'Get the event off the host',
    qradar: ['WinCollect agent', 'syslog / MSRPC to an Event Collector'],
    splunk: ['Universal Forwarder', 'splunktcp 9997 to an indexer'],
    wazuh: ['wazuh-logcollector → wazuh-agentd', '1514/TCP, AES, to wazuh-remoted'],
  },
  {
    phase: 'parse',
    job: 'Raw text → named fields',
    qradar: ['DSM inside ecs-ec', 'at ingest — normalised before storage'],
    splunk: ['props.conf / transforms.conf', 'at search time — schema-on-read'],
    wazuh: ['Decoders in wazuh-analysisd', 'at ingest, before rule matching'],
  },
  {
    phase: 'parse',
    job: 'Common schema across vendors',
    qradar: ['QID + low/high level category', 'fixed taxonomy, assigned at parse'],
    splunk: ['CIM data models', 'applied by add-ons at search time'],
    wazuh: ['Decoder field names + rule groups', 'convention, not an enforced schema'],
  },
  {
    phase: 'correlate',
    job: 'Many events → one finding',
    qradar: ['Custom Rules Engine in ecs-ep', 'streaming, stateful, always on'],
    splunk: ['Correlation search in ES', 'scheduled search over a data model'],
    wazuh: ['Composite rules in wazuh-analysisd', 'frequency + timeframe + if_matched_sid'],
  },
  {
    phase: 'store',
    job: 'Where events live',
    qradar: ['Ariel, /store/ariel', 'time-series, on the processing appliance'],
    splunk: ['Index buckets', 'rawdata journal + tsidx, hot→warm→cold'],
    wazuh: ['Wazuh indexer', 'OpenSearch, wazuh-alerts-4.x-*'],
  },
  {
    phase: 'present',
    job: 'The analyst queue',
    qradar: ['Offense (Magistrate/MPC)', 'ranked by magnitude on the Offenses tab'],
    splunk: ['Notable event', 'ranked by urgency in Incident Review'],
    wazuh: ['Alert, rule level 0–16', 'Threat Hunting in the dashboard'],
  },
  {
    phase: 'present',
    job: 'Query language',
    qradar: ['AQL', 'SQL-shaped, over Ariel'],
    splunk: ['SPL', 'pipeline of commands'],
    wazuh: ['DQL / Lucene, or the indexer API', 'OpenSearch query DSL underneath'],
  },
]
