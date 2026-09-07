import { describe, expect, it } from 'vitest'
import { applyAll, getTransformation, runPipeline, transformations } from './transforms.js'

const only = (id, value) => getTransformation(id).apply(value)

describe('urlDecodeUni', () => {
  it('decodes percent escapes', () => {
    expect(only('urlDecodeUni', '%27%20OR%201%3D1')).toBe("' OR 1=1")
  })

  it('decodes %u escapes too', () => {
    expect(only('urlDecodeUni', '%u0027 OR 1=1')).toBe("' OR 1=1")
  })

  it('turns + into a space, as form encoding means it to', () => {
    expect(only('urlDecodeUni', 'a+b')).toBe('a b')
  })

  it('leaves a stray percent alone rather than mangling it', () => {
    expect(only('urlDecodeUni', '100% sure')).toBe('100% sure')
  })
})

describe('htmlEntityDecode', () => {
  it('decodes named and numeric entities', () => {
    expect(only('htmlEntityDecode', '&lt;script&gt;')).toBe('<script>')
    expect(only('htmlEntityDecode', '&#60;script&#62;')).toBe('<script>')
    expect(only('htmlEntityDecode', '&#x3c;script&#x3e;')).toBe('<script>')
  })
})

describe('removeCommentsChar', () => {
  it('keeps the payload and drops only the comment characters', () => {
    expect(only('removeCommentsChar', 'OR/**/1=1')).toBe('OR1=1')
    expect(only('removeCommentsChar', "' or 1=1--")).toBe("' or 1=1")
  })
})

describe('the pipeline', () => {
  const evasion = '%27%2f%2a%2a%2fOr%2f%2a%2a%2f1%3d1%2d%2d'

  it('leaves the raw evasion unreadable when nothing is enabled', () => {
    expect(applyAll(evasion, [])).toBe(evasion)
  })

  it('peels an encoded, commented, mixed-case payload back to plain SQL', () => {
    const output = applyAll(evasion, ['urlDecodeUni', 'removeCommentsChar', 'lowercase'])
    expect(output).toBe("'or1=1")
  })

  it('order matters: decoding has to happen before comment stripping', () => {
    // comment characters are still percent-encoded, so stripping first is a no-op
    const stripFirst = getTransformation('removeCommentsChar').apply(evasion)
    expect(stripFirst).toBe(evasion)
  })

  it('records every step, and which ones actually changed the value', () => {
    const { steps } = runPipeline(evasion, ['urlDecodeUni', 'lowercase'])
    expect(steps.map((step) => step.id)).toEqual(['urlDecodeUni', 'lowercase'])
    expect(steps[0].changed).toBe(true)
    expect(steps[0].before).toBe(evasion)
    expect(steps[1].before).toBe(steps[0].after)
  })

  it('always runs in the declared order, whatever order the ids arrive in', () => {
    const forwards = applyAll('%3CSCRIPT%3E', ['urlDecodeUni', 'lowercase'])
    const backwards = applyAll('%3CSCRIPT%3E', ['lowercase', 'urlDecodeUni'])
    expect(forwards).toBe(backwards)
    expect(forwards).toBe('<script>')
  })

  it('every transformation is a pure function of its input', () => {
    for (const transformation of transformations) {
      const input = "Test' /*x*/ %41 &lt;b&gt;  value"
      expect(transformation.apply(input)).toBe(transformation.apply(input))
    }
  })
})
