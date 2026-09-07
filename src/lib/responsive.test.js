import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A layout guard, not a unit test.
 *
 * Nothing here runs the UI — it scans the JSX for the patterns that make a
 * page scroll sideways on a phone. Every one of these was an actual defect
 * found on a 375px screen, so the rules are the fixes written down rather
 * than a style preference.
 */
function jsxFiles(dir = 'src', found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) jsxFiles(path, found)
    else if (path.endsWith('.jsx')) found.push(path)
  }
  return found
}

const files = jsxFiles().map((path) => ({ path, source: readFileSync(path, 'utf8') }))

describe('nothing forces the page wider than a phone', () => {
  it('has files to check at all', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it('gives every <pre> somewhere to scroll', () => {
    const offenders = files.flatMap(({ path, source }) =>
      [...source.matchAll(/<pre[^>]*className="([^"]*)"/g)]
        .filter(([, classes]) => !classes.includes('overflow-x-auto'))
        .map(() => path),
    )
    expect(offenders).toEqual([])
  })

  it('wraps every deliberately-wide block in a scroll container', () => {
    const offenders = files
      .filter(({ source }) => {
        const wide = [...source.matchAll(/min-w-\[(\d+(?:\.\d+)?)rem\]/g)].some(
          ([, rem]) => Number(rem) >= 20,
        )
        return wide && !source.includes('overflow-x-auto')
      })
      .map(({ path }) => path)
    expect(offenders).toEqual([])
  })

  it('never puts three or more grid columns on the smallest screen', () => {
    const offenders = files.flatMap(({ path, source }) =>
      [...source.matchAll(/(^|[\s"'`{])grid-cols-([3-9]|1[0-2])\b/g)].map(() => path),
    )
    expect(offenders).toEqual([])
  })

  it('lets any wide fixed gutter collapse below the sm breakpoint', () => {
    const offenders = files.flatMap(({ path, source }) =>
      [...source.matchAll(/(?<!:)\bw-(2[89]|[3-9]\d)\s+shrink-0/g)]
        .filter((match) => {
          const window = source.slice(Math.max(0, match.index - 120), match.index + 160)
          return !/\bsm:w-/.test(window)
        })
        .map(() => path),
    )
    expect(offenders).toEqual([])
  })
})
