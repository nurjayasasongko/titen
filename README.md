# Titen

*Titen* (Javanese) — knowledge built through repeated, careful observation. That is the whole method here: you learn a security system by watching it run, not by memorising a definition of it.

Security systems are usually taught as diagrams and definitions. This site picks one
system per module and **animates the mechanism** — the request moving through it, the
fields being pulled out of raw text, the counter crossing a threshold — so the thing you
were told becomes something you watched happen.

Built for analysts who can read an alert but have never seen the engineering underneath.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build
```

## Structure

```
src/
  app/                 site shell: header, breadcrumb, module catalogue
  components/          shared UI used by every module (icons, theme toggle)
  lib/                 shared logic: hash router, SVG edge geometry, DOM measurement
  components/lessons/  the shared lesson shell and macro overview map
  modules/
    registry.js        the site's table of contents
    siem/              one module
      index.js         manifest — the contract the shell reads
      SiemModule.jsx   owns the module's own routes
      learn/           vendor-neutral concept demos
      products/        the same pipeline as real components
      data/            all content; components read it, never contain it
      lib/             domain logic, unit tested (correlation windows, detection timing)
    waf/               same shape: learn/, implementations/, data/, lib/
    auth/              Kerberos + Kerberoasting: learn/, data/, lib/
```

Two modules share `LessonTrack` and `OverviewMap`, so a third one gets the
numbered lesson rail, the macro map and the demo frame without writing any of it.

Routes are hash-based, so every screen is a link worth sending to a colleague:

| Route | Shows |
| --- | --- |
| `#/` | module catalogue |
| `#/siem/learn/parse` | one concept lesson |
| `#/siem/products/wazuh/analysisd` | one component of one product |
| `#/siem/compare` | cross-product behavioural comparison |
| `#/waf/learn/evasion` | a WAF concept lesson |
| `#/waf/implementations` | ModSecurity vs AWS WAF vs Cloudflare |
| `#/auth/learn/kerberoast` | the crack-time calculator |

Unknown routes fall back rather than erroring — a bad module id shows the catalogue, a
bad lesson id shows lesson one.

## Adding a module

1. Create `src/modules/<id>/` with an `index.js` manifest and a component.
2. Add it to the `modules` array in `src/modules/registry.js`.
3. Nothing in `src/app/` changes.

The manifest contract is enforced by `src/modules/registry.test.js`, so a module that
forgets a field fails a test rather than rendering a broken card. A module listed without
a `component` shows in the catalogue as *planned* with its intended contents — that is
how the unbuilt modules are represented today.

## A note on accuracy

Product-specific content follows vendor documentation rather than recollection: the
QRadar pipeline stages come from IBM's *Architecture and Deployment Guide*, the Splunk
pipeline segments from *How data moves through Splunk deployments*, and the Wazuh daemon
roles from the Wazuh daemon reference.

In the WAF module, every rule ID, message, severity and paranoia level is taken verbatim
from the OWASP CRS source; the anomaly scores and thresholds from the CRS anomaly-scoring
documentation; the body inspection limits from the AWS WAF developer guide and the
ModSecurity reference manual; and the score thresholds from Cloudflare's OWASP ruleset
reference. The pattern matching behind those rules is deliberately simplified — the real
rules use libinjection and much longer regular expressions — and the UI says so where a
reader might otherwise assume more.

Where a lesson makes a claim about behaviour, that claim is unit tested — the correlation
tests assert that everyday noise never trips a sane threshold, that the attack does, and
that a too-short lookback silently misses it. If the numbers are ever edited into a lie,
the tests fail.
