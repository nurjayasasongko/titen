/**
 * ModSecurity-style text transformations.
 *
 * A WAF rule almost never matches the bytes the attacker sent. It matches
 * what is left after a normalisation pipeline, because the same payload can
 * be written a hundred ways. These are simplified but faithful versions of
 * the transformations CRS rules actually declare with `t:`.
 */

function urlDecodeUni(value) {
  return value
    .replace(/\+/g, ' ')
    .replace(/%u([0-9a-f]{4})|%([0-9a-f]{2})/gi, (match, unicode, hex) => {
      const code = parseInt(unicode ?? hex, 16)
      return Number.isNaN(code) ? match : String.fromCharCode(code)
    })
}

const entities = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
}

function htmlEntityDecode(value) {
  return value
    .replace(/&(?:#x([0-9a-f]+)|#(\d+));?/gi, (match, hex, dec) => {
      const code = parseInt(hex ?? dec, hex ? 16 : 10)
      return Number.isNaN(code) ? match : String.fromCharCode(code)
    })
    .replace(/&[a-z]+;/gi, (match) => entities[match.toLowerCase()] ?? match)
}

/** Removes the comment characters, keeping whatever was between them. */
function removeCommentsChar(value) {
  return value.replace(/\/\*|\*\/|<!--|-->|--|#/g, '')
}

/**
 * Replaces a whole comment with a single space. This is the one that
 * defeats SELECT/*comment*\/FROM: removing the characters alone would glue
 * the keywords together, replacing leaves a word boundary behind.
 */
function replaceComments(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, ' ')
}

export const transformations = [
  {
    id: 'urlDecodeUni',
    label: 't:urlDecodeUni',
    blurb: 'Turns %27 and %u0027 back into the character they encode, and + into a space.',
    apply: urlDecodeUni,
  },
  {
    id: 'htmlEntityDecode',
    label: 't:htmlEntityDecode',
    blurb: 'Turns &lt; and &#60; back into <.',
    apply: htmlEntityDecode,
  },
  {
    id: 'removeCommentsChar',
    label: 't:removeCommentsChar',
    blurb: 'Strips /* */ -- and # so a comment glued into a keyword stops hiding it.',
    apply: removeCommentsChar,
  },
  {
    id: 'replaceComments',
    label: 't:replaceComments',
    blurb: 'Replaces a whole /* ... */ comment with one space, so SELECT/**/FROM becomes SELECT FROM and not SELECTFROM.',
    apply: replaceComments,
  },
  {
    id: 'removeNulls',
    label: 't:removeNulls',
    blurb: 'Strips NUL bytes, which some parsers treat as end-of-string and some do not.',
    apply: (value) => value.replace(/\0/g, ''),
  },
  {
    id: 'compressWhitespace',
    label: 't:compressWhitespace',
    blurb: 'Collapses runs of whitespace, including tabs and newlines, into one space.',
    apply: (value) => value.replace(/\s+/g, ' '),
  },
  {
    id: 'lowercase',
    label: 't:lowercase',
    blurb: 'Makes the comparison case-insensitive, so SeLeCt is the same as select.',
    apply: (value) => value.toLowerCase(),
  },
]

export function getTransformation(id) {
  return transformations.find((item) => item.id === id) ?? null
}

/**
 * Runs the pipeline in order, returning what the value looked like after
 * each step so the demo can show the payload being peeled apart.
 */
export function runPipeline(value, enabledIds) {
  const steps = []
  let current = value
  for (const transformation of transformations) {
    if (!enabledIds.includes(transformation.id)) continue
    const before = current
    current = transformation.apply(current)
    steps.push({
      id: transformation.id,
      label: transformation.label,
      before,
      after: current,
      changed: before !== current,
    })
  }
  return { steps, output: current }
}

export function applyAll(value, enabledIds) {
  return runPipeline(value, enabledIds).output
}
