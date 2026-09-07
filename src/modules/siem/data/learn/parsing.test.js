import { describe, expect, it } from 'vitest'
import { changeTags, samples, schemaFields } from './parsing.js'

const ids = schemaFields.map((f) => f.id)

describe('every sample fills the whole schema', () => {
  it.each(samples.map((s) => [s.id, s]))('%s has a cell for each schema field', (_id, sample) => {
    expect(Object.keys(sample.fields).sort()).toEqual([...ids].sort())
    for (const cell of Object.values(sample.fields)) {
      expect(cell.rawName).toBeTruthy()
      expect(cell.value).toBeTruthy()
      expect(Object.keys(changeTags)).toContain(cell.change)
    }
  })
})

describe('parsing is the per-source half', () => {
  it('gives the user field a different source name in each format', () => {
    const rawNames = samples.map((s) => s.fields.user.rawName)
    expect(new Set(rawNames).size).toBe(samples.length)
  })

  it('uses a different parser per format', () => {
    expect(new Set(samples.map((s) => s.parser)).size).toBe(samples.length)
  })

  it('keeps the raw texts entirely unalike', () => {
    expect(new Set(samples.map((s) => s.raw)).size).toBe(samples.length)
  })
})

describe('normalising is the unifying half', () => {
  it('collapses user, src_ip and action to one value across every source', () => {
    for (const key of ['user', 'src_ip', 'outcome']) {
      const values = samples.map((s) => s.fields[key].value)
      expect(new Set(values).size).toBe(1)
    }
    // the shared outcome value is the mapped vocabulary word
    expect(samples.every((s) => s.fields.outcome.value === 'failure')).toBe(true)
  })

  it('does NOT force a shared value on the signature — it stays source-specific', () => {
    const sigs = samples.map((s) => s.fields.signature.value)
    expect(new Set(sigs).size).toBe(samples.length)
  })

  it('marks the outcome as mapped or inferred everywhere — never a plain rename', () => {
    for (const sample of samples) {
      expect(['mapped', 'inferred']).toContain(sample.fields.outcome.change)
    }
  })

  it('Windows infers the outcome (the word "failure" is not in the log)', () => {
    const win = samples.find((s) => s.id === 'windows')
    expect(win.fields.outcome.change).toBe('inferred')
    expect(win.raw.toLowerCase()).not.toContain('failure')
  })
})
