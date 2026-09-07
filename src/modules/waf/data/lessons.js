/**
 * Level 1 for the WAF module: the mechanism, with no product names in it.
 * Each lesson pairs one interactive demo with the idea it demonstrates.
 */
export const lessons = [
  {
    id: 'sees',
    number: 1,
    title: 'What a WAF can see',
    question: 'We already have a firewall. Why do we need another one for the web?',
    idea: [
      'A network firewall judges a connection: this address, talking to that address, on that port. For a public website the answer is always yes — port 443 has to be open, or the site does not exist. Every customer and every attacker arrives through the same permitted door.',
      'A web application firewall opens the envelope. It reads the HTTP request itself: which page, which parameters, which headers, which cookies, and what was typed into the form. Only at that level of detail can "a customer searching for shoes" and "an attacker searching for your password table" look different, because at the network level they are byte-for-byte the same kind of connection.',
      'That is the whole justification for a second firewall. It is not a stronger version of the first one — it is looking at a completely different layer of the same traffic.',
    ],
    takeaway:
      'A network firewall decides whether a conversation may happen. A WAF reads what was said. Both allow the same connection; only one can object to its contents.',
    gotcha:
      'A WAF only sees what reaches it in a form it can read. Traffic that bypasses it — a direct hit on the origin server’s IP address, or an internal caller skipping the proxy — is completely uninspected. The first thing to verify about any WAF is that there is no route to the application that goes around it.',
  },
  {
    id: 'phases',
    number: 2,
    title: 'Phases — when the WAF gets to look',
    question: 'My rule is correct but it never matches. What am I missing?',
    idea: [
      'A WAF does not see the whole request at once. An HTTP request arrives in pieces: the request line and headers first, the body afterwards — and the response, obviously, later still. The engine therefore runs in phases, and each phase can only inspect what has physically arrived by then.',
      'That is why the same rule works in one phase and does nothing in another. A rule placed in the request-headers phase cannot see a POST body, because at that instant the body has not been read off the socket. Nothing errors; the rule simply never matches, which is far harder to notice than a crash.',
      'The response phases exist for the opposite reason: to inspect what your application says back. That is where you catch a stack trace, a database error, or a page returning data it should not — problems that are invisible while looking only at the request.',
    ],
    takeaway:
      'Five phases: request headers, request body, response headers, response body, logging. Match a rule to the phase where the data it needs actually exists.',
    gotcha:
      'Body inspection has to be explicitly enabled and buffered, and every WAF caps how much of the body it will hold. Past that cap it stops looking — so a payload buried after the limit is invisible to an otherwise perfect rule.',
  },
  {
    id: 'evasion',
    number: 3,
    title: 'Matching — why rules normalise before they look',
    question: 'Can’t the attacker just spell the payload differently and walk past?',
    idea: [
      'They try constantly. The same SQL injection can be percent-encoded, case-shuffled, split by inline comments, doubly encoded, or padded with whitespace. All of those arrive as different bytes, and all of them mean exactly the same thing to the database at the other end.',
      'So a WAF rule almost never matches raw bytes. It declares a normalisation pipeline first — decode the encoding, fold the case, replace the comments — and matches against the result. The rule author writes one clean pattern; the transformations undo the disguises before that pattern is ever applied.',
      'The order matters, and it is not arbitrary. Stripping comment characters before decoding does nothing, because the comment characters are still percent-encoded at that point. Every transformation exists because someone once got past the rule without it.',
    ],
    takeaway:
      'A rule is a pattern plus a normalisation pipeline. The pattern is the easy half — the pipeline is what makes it survive contact with an attacker.',
    gotcha:
      'Normalisation is also where WAFs and applications disagree. If the WAF decodes something once and your framework decodes it twice, the WAF inspected a string your application never sees — and the payload arrives intact behind a rule that genuinely did not match.',
  },
  {
    id: 'scoring',
    number: 4,
    title: 'Anomaly scoring — no single rule blocks',
    question: 'A rule matched. Why wasn’t the request blocked?',
    idea: [
      'Because in a modern rule set, matching is not the same as blocking. Each rule that matches contributes points according to its severity, and the request keeps travelling through the rest of the rules collecting more. Only at the end does one final rule compare the accumulated total against a threshold and decide.',
      'This is called collaborative detection, and it exists because individual rules are not confident enough on their own. Three weak signals — an odd header, unusual punctuation, a missing field — mean little separately and quite a lot together. Blocking on any one of them would generate constant false positives.',
      'The practical consequence is that a rule matching is not an incident. Your logs will show matches on requests that were correctly allowed through, and that is the system working as designed rather than a near miss.',
    ],
    takeaway:
      'Detection is decoupled from blocking. Rules add score; one final rule compares the total to the threshold. A match on its own means nothing.',
    gotcha:
      'The corollary catches everyone: lowering the threshold to catch more attacks scales up every borderline match at once. Because scores accumulate, a small change to the threshold can convert a large population of quietly-scoring normal requests into blocked customers overnight.',
  },
  {
    id: 'paranoia',
    number: 5,
    title: 'Paranoia levels — how suspicious should it be?',
    question: 'There is a setting that catches more attacks. Why is it not on by default?',
    idea: [
      'Because the extra rules it switches on are the aggressive ones — the ones that flag input for being unusual rather than for being provably malicious. A rule that counts special characters in a form field will catch obfuscated injection, and it will also catch an angry customer using a lot of punctuation.',
      'Paranoia levels are that dial, made explicit and layered. Each level adds rules on top of the levels beneath it: the baseline aims to be quiet enough to run untuned, while the top level is written for systems where a missed attack costs more than a blocked customer.',
      'There is no correct setting to look up. It is a judgement about your application and what a false block actually costs you — which is why the same rule set can be genuinely right at one level for a marketing site and at another for a banking API.',
    ],
    takeaway:
      'Higher paranoia catches more attacks and blocks more customers. The level you want is the one whose false positives you can afford to tune.',
    gotcha:
      'Raising the level is a five-second change that produces weeks of work. The new rules fire on traffic that has always been there and always been fine, so the false positives arrive immediately and all at once — usually during business hours, from your most talkative real users.',
  },
  {
    id: 'tuning',
    number: 6,
    title: 'Tuning — the WAF blocked a real customer',
    question: 'A real request got blocked. What do I actually do about it?',
    idea: [
      'First understand that the rule was not wrong. The text really did look like an attack — the field genuinely contained SQL. The rule cannot know that this particular field, on this particular endpoint, is a support form where SQL is a perfectly normal thing for a human to paste.',
      'That knowledge is yours to supply, and how precisely you supply it is the entire skill. You can switch blocking off, delete the rule, or exclude that one rule from that one parameter. All three make the complaint stop. Only one of them leaves the protection standing everywhere else.',
      'The instinct under pressure is always the blunt fix, because it is fastest and it visibly works. The problem is that nothing tells you afterwards what you gave up — the attack the rule used to catch now passes silently, and there is no alert for a detection you deleted yourself.',
    ],
    takeaway:
      'Fix false positives with the narrowest exclusion that works: this rule, this parameter, this endpoint. Deleting the rule fixes the same symptom and costs you the detection everywhere.',
    gotcha:
      'Detection-only mode is the most dangerous fix of all, because everything still appears in the logs. The dashboard fills with matches, the graphs look identical to a working WAF, and nothing has been blocked for months.',
  },
]
