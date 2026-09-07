import SiemModule from './SiemModule.jsx'

/**
 * Module manifest. Copy this shape for a new module.
 *
 *   id        route segment and registry key
 *   views     the module's own second-level routes
 *   component receives { segments, navigate } scoped to inside the module
 */
export default {
  id: 'siem',
  name: 'SIEM',
  category: 'Detection & response',
  icon: 'git-merge',
  summary:
    'One log line followed from the server that wrote it to the analyst who reads the alert — first as concepts, then inside QRadar, Splunk and Wazuh.',
  question: 'What actually happens between a failed login and someone being told about it?',
  covers: [
    'The five jobs every SIEM does, each one animated rather than described',
    'Parsing and normalisation shown on three log formats that look nothing alike',
    'Correlation as a sliding window you can retune and watch fire, or miss',
    'The same pipeline as real components: ecs-ec, splunkd queues, wazuh-analysisd',
  ],
  views: [
    { id: 'learn', label: 'Learn how a SIEM works', note: 'No product names. Start here.' },
    { id: 'products', label: 'See it in real products', note: 'QRadar · Splunk · Wazuh' },
  ],
  defaultView: 'learn',
  component: SiemModule,
}
