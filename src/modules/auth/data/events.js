/**
 * Field names, encryption types and pre-authentication types are taken from
 * the Microsoft Learn pages for events 4768 and 4769.
 */
export const ticketEncryptionTypes = [
  { hex: '0x1', name: 'DES-CBC-CRC', note: 'Disabled by default since Windows 7 / Server 2008 R2.', bad: true },
  { hex: '0x3', name: 'DES-CBC-MD5', note: 'Disabled by default since Windows 7 / Server 2008 R2.', bad: true },
  { hex: '0x11', name: 'AES128-CTS-HMAC-SHA1-96', note: 'One of the two values Microsoft says to expect.', expected: true },
  { hex: '0x12', name: 'AES256-CTS-HMAC-SHA1-96', note: 'The other expected value.', expected: true },
  { hex: '0x17', name: 'RC4-HMAC', note: 'Default before Server 2008. What roasting tools ask for.', roast: true },
  { hex: '0x18', name: 'RC4-HMAC-EXP', note: 'Export-grade variant of the same legacy suite.', roast: true },
  { hex: '0xffffffff', name: '—', note: 'Shows in audit failure events.' },
]

export const preAuthTypes = [
  { code: '0', name: '—', note: 'Logon without pre-authentication. Microsoft: all accounts should use pre-authentication; an account configured with “Do not require Kerberos preauthentication” is a security risk.', risky: true },
  { code: '2', name: 'PA-ENC-TIMESTAMP', note: 'The normal type for standard password authentication.', normal: true },
  { code: '15', name: 'PA-PK-AS-REP_OLD', note: 'Smart card logon.' },
  { code: '138', name: 'PA-ENCRYPTED-CHALLENGE', note: 'Kerberos armoring (FAST), Server 2012 and Windows 8 onwards.' },
]

/** Verbatim from the Microsoft monitoring recommendations for 4769. */
export const microsoftGuidance =
  'Starting with Windows Vista and Windows Server 2008, monitor for a Ticket Encryption Type other than 0x11 and 0x12. These are the expected values, starting with these operating systems, and represent AES-family algorithms.'

export const sampleEvents = {
  tgt: {
    id: '4768',
    title: 'A Kerberos authentication ticket (TGT) was requested',
    fields: [
      ['TargetUserName', 'j.reyes'],
      ['TargetDomainName', 'CORP.EXAMPLE.COM'],
      ['ServiceName', 'krbtgt'],
      ['ServiceSid', 'S-1-5-21-…-502'],
      ['TicketOptions', '0x40810010'],
      ['TicketEncryptionType', '0x12'],
      ['PreAuthType', '2'],
      ['IpAddress', '::ffff:10.20.4.31'],
      ['Status', '0x0'],
    ],
  },
  serviceTicket: {
    id: '4769',
    title: 'A Kerberos service ticket was requested',
    fields: [
      ['TargetUserName', 'j.reyes@CORP.EXAMPLE.COM'],
      ['TargetDomainName', 'CORP.EXAMPLE.COM'],
      ['ServiceName', 'svc_sql'],
      ['ServiceSid', 'S-1-5-21-…-1147'],
      ['TicketOptions', '0x40810000'],
      ['TicketEncryptionType', '0x12'],
      ['IpAddress', '::ffff:10.20.4.31'],
      ['Status', '0x0'],
    ],
  },
  roast: {
    id: '4769',
    title: 'A Kerberos service ticket was requested — during a roast',
    fields: [
      ['TargetUserName', 'j.reyes@CORP.EXAMPLE.COM'],
      ['TargetDomainName', 'CORP.EXAMPLE.COM'],
      ['ServiceName', 'svc_sql'],
      ['ServiceSid', 'S-1-5-21-…-1147'],
      ['TicketOptions', '0x40810000'],
      ['TicketEncryptionType', '0x17'],
      ['IpAddress', '::ffff:10.20.4.31'],
      ['Status', '0x0'],
    ],
    highlight: 'TicketEncryptionType',
  },
}

/** The service principals in the demo domain. */
export const spns = [
  { spn: 'MSSQLSvc/db01.corp.example.com:1433', account: 'svc_sql', kind: 'user', set: 'RC4 + AES' },
  { spn: 'HTTP/intranet.corp.example.com', account: 'svc_web', kind: 'user', set: 'RC4 + AES' },
  { spn: 'CIFS/fs01.corp.example.com', account: 'FS01$', kind: 'computer', set: 'AES only' },
  { spn: 'MSSQLSvc/reporting.corp.example.com:1433', account: 'gmsa_report$', kind: 'gmsa', set: 'AES only' },
  { spn: 'HTTP/legacy-crm.corp.example.com', account: 'svc_crm', kind: 'user', set: 'RC4 only' },
]
