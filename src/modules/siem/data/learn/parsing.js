/**
 * Data for the parse-and-normalise lesson. These are two different jobs and
 * the demo shows them as two, on the same event:
 *
 *   PARSE      pull values out of raw text into named fields — but the names
 *              are still the SOURCE's own, and every format needs its own
 *              parser. Windows gives you "Account Name"; on Linux you capture
 *              it out of a sentence; on Cisco it is a positional field.
 *   NORMALISE  map those source-specific fields onto one shared schema, and
 *              rewrite categorical values (Rejected / Failed / 4625) into a
 *              shared vocabulary (action=failure). Only after this are the
 *              three sources comparable.
 *
 * Per field we therefore carry both halves: the parse result (rawName +
 * rawValue) and the normalise result (schema + value), plus a `change` tag
 * describing what normalisation did to it.
 */

/** The shared schema every source is mapped onto. */
export const schemaFields = [
  { id: 'timestamp', schema: 'timestamp' },
  { id: 'host', schema: 'dest_host' },
  { id: 'user', schema: 'user' },
  { id: 'src_ip', schema: 'src_ip' },
  { id: 'signature', schema: 'signature' },
  { id: 'outcome', schema: 'action' },
]

/** What each `change` tag means, shown as a small legend. */
export const changeTags = {
  renamed: 'field renamed, value kept',
  reformatted: 'value rewritten to a standard form',
  trimmed: 'value tidied',
  mapped: 'value rewritten to the shared vocabulary',
  inferred: 'no source field — derived from meaning',
}

export const samples = [
  {
    id: 'windows',
    label: 'Windows Server',
    sublabel: 'Security event log · Event ID 4625',
    parser: 'DSM / XML parser',
    raw: `LogName=Security
EventCode=4625
ComputerName=WIN-APP01.corp.example.com
Message=An account failed to log on.
  Account Name:  j.reyes
  Logon Type:    10
  Source Network Address:  203.0.113.47
  Sub Status:    0xC000006A`,
    fields: {
      timestamp: { rawName: 'record time', rawValue: '09/05/2026 09:14:22 AM', value: '2026-09-05T09:14:22Z', change: 'reformatted' },
      host: { rawName: 'ComputerName', rawValue: 'WIN-APP01.corp.example.com', value: 'WIN-APP01', change: 'trimmed' },
      user: { rawName: 'Account Name', rawValue: 'j.reyes', value: 'j.reyes', change: 'renamed' },
      src_ip: { rawName: 'Source Network Address', rawValue: '203.0.113.47', value: '203.0.113.47', change: 'renamed' },
      signature: { rawName: 'EventCode', rawValue: '4625', value: '4625', change: 'renamed' },
      outcome: { rawName: '(EventCode 4625)', rawValue: '—', value: 'failure', change: 'inferred' },
    },
    parseNote:
      'The Windows parser knows this XML shape: it reads named elements like ComputerName and “Account Name” straight out. These are Microsoft’s names, not anyone else’s.',
    normaliseNote:
      '“Account Name” becomes user, “Source Network Address” becomes src_ip. And action=failure is filled in from the meaning of EventCode 4625 — the word “failure” is nowhere in the log.',
  },
  {
    id: 'linux',
    label: 'Linux server',
    sublabel: 'sshd via syslog',
    parser: 'regex / grok parser',
    raw: `Sep  5 09:14:22 web01 sshd[2201]: Failed password for invalid user j.reyes from 203.0.113.47 port 49765 ssh2`,
    fields: {
      timestamp: { rawName: 'syslog header', rawValue: 'Sep  5 09:14:22', value: '2026-09-05T09:14:22Z', change: 'reformatted' },
      host: { rawName: 'syslog host', rawValue: 'web01', value: 'web01', change: 'renamed' },
      user: { rawName: 'capture group', rawValue: 'j.reyes', value: 'j.reyes', change: 'renamed' },
      src_ip: { rawName: 'capture group', rawValue: '203.0.113.47', value: '203.0.113.47', change: 'renamed' },
      signature: { rawName: 'message text', rawValue: 'Failed password', value: 'Failed password', change: 'renamed' },
      outcome: { rawName: 'message text', rawValue: 'Failed', value: 'failure', change: 'mapped' },
    },
    parseNote:
      'There are no named fields here at all — it is one sentence. The parser is a regular expression that captures the user and IP out of fixed positions in the text. A completely different parser from the Windows one.',
    normaliseNote:
      'The capture groups become user and src_ip. The word “Failed” in the sentence is mapped to the same action=failure that Windows produced — different word, same normalised value.',
  },
  {
    id: 'firewall',
    label: 'Cisco ASA firewall',
    sublabel: 'VPN authentication',
    parser: 'CEF / positional parser',
    raw: `Sep 05 2026 09:14:22 fw-edge-01 : %ASA-6-113005: AAA user authentication Rejected : reason = Invalid password : server = 10.1.1.5 : user = j.reyes : user IP = 203.0.113.47`,
    fields: {
      timestamp: { rawName: 'syslog header', rawValue: 'Sep 05 2026 09:14:22', value: '2026-09-05T09:14:22Z', change: 'reformatted' },
      host: { rawName: 'device name', rawValue: 'fw-edge-01', value: 'fw-edge-01', change: 'renamed' },
      user: { rawName: 'user = …', rawValue: 'j.reyes', value: 'j.reyes', change: 'renamed' },
      src_ip: { rawName: 'user IP = …', rawValue: '203.0.113.47', value: '203.0.113.47', change: 'renamed' },
      signature: { rawName: 'message code', rawValue: '%ASA-6-113005', value: '%ASA-6-113005', change: 'renamed' },
      outcome: { rawName: 'AAA result', rawValue: 'Rejected', value: 'failure', change: 'mapped' },
    },
    parseNote:
      'Cisco crams key=value pairs into one line behind a vendor code. The parser splits on the delimiters to pull user and user IP. Different again from both the others.',
    normaliseNote:
      '“Rejected” is the firewall’s word for a failed auth. Normalisation rewrites it to action=failure — the exact value Windows and Linux ended up with, so one rule now matches all three.',
  },
]

export const closingPoint =
  'Look at the two halves separately. The left half — parsing — is a different job for every source: three formats, three parsers, three sets of field names. The right half — normalising — is where those three sets collapse into one schema, and that is the only reason a single correlation rule can ever span Windows, Linux and a firewall at once.'
