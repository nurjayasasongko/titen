import AuthModule from './AuthModule.jsx'

export default {
  id: 'auth',
  name: 'Authentication',
  category: 'Identity',
  icon: 'key',
  summary:
    'Kerberos as a sequence of encrypted messages between four parties — and Kerberoasting drawn on the exact same diagram, because it uses the protocol working exactly as designed.',
  question: 'What is a TGT, and why does asking for a service ticket hand an attacker a password to crack?',
  covers: [
    'Why nobody ever sends a password, and why the KDC can impersonate anyone',
    'The AS exchange and the TGT — plus AS-REP roasting when pre-auth is off',
    'Service tickets: any user can request any SPN, and the reply is sealed with the service’s own key',
    'Kerberoasting end to end, why RC4 makes it 4096× cheaper, and the honeypot SPN that catches it for free',
  ],
  views: [
    { id: 'learn', label: 'Learn how Kerberos works', note: 'Kerberoasting on the same diagram.' },
  ],
  defaultView: 'learn',
  component: AuthModule,
}
