import TopologyScene from '../../../components/topology/TopologyScene.jsx'
import aws from '../data/topology/aws.js'
import cloudflare from '../data/topology/cloudflare.js'
import modsec from '../data/topology/modsec.js'

const specs = { modsec, aws, cloudflare }

const footnotes = {
  modsec: (
    <>
      <span className="font-medium text-slate-800 dark:text-slate-200">
        Look at which side of the dashed line the 403 happens on.
      </span>{' '}
      Every refused request still opened a connection to your server and was inspected by
      your CPU. You own the verdict and you own the cost of reaching it — which is why a
      scanner pointed at a ModSecurity deployment is a capacity problem as well as a
      security one. Press the scanner button and watch the CPU counter, not the block
      counter.
    </>
  ),
  aws: (
    <>
      <span className="font-medium text-slate-800 dark:text-slate-200">
        There is no score bar here, and that is the point.
      </span>{' '}
      Rules run in priority order and the first terminating action ends the evaluation —
      the lights show which rule number stopped each request. Rules set to Count match
      without terminating, so traffic keeps going. And the purple packets are bodies larger
      than the ACL will read: the rule that would have caught them never saw them.
    </>
  ),
  cloudflare: (
    <>
      <span className="font-medium text-slate-800 dark:text-slate-200">
        The dashed line is far to the right for a reason.
      </span>{' '}
      Refused traffic is stopped on the edge network and never reaches anything you own —
      no connection, no CPU, no log on your disk. Cycle the sensitivity and watch the
      threshold move between 60, 40 and 25: the lower the number, the less evidence
      Cloudflare needs before it refuses someone.
    </>
  ),
}

export default function ImplementationTopology({ id }) {
  const spec = specs[id]
  if (!spec) return null
  return <TopologyScene key={spec.id} spec={spec} footnote={footnotes[id]} />
}
