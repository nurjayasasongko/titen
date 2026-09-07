import { describe, expect, it } from 'vitest'
import { categories, getModule, modules } from './registry.js'

/**
 * The manifest contract. These run against every module, so a new one that
 * forgets a field fails here rather than rendering a broken catalogue card.
 */
describe('every module', () => {
  it.each(modules.map((module) => [module.id, module]))('%s has the required fields', (_id, module) => {
    expect(module.id).toMatch(/^[a-z0-9-]+$/)
    expect(module.name).toBeTruthy()
    expect(module.summary).toBeTruthy()
    expect(module.question).toMatch(/\?$/)
    expect(Array.isArray(module.covers)).toBe(true)
    expect(module.covers.length).toBeGreaterThanOrEqual(3)
    expect(module.icon).toBeTruthy()
  })

  it.each(modules.map((module) => [module.id, module]))(
    '%s sits in a category the home page renders',
    (_id, module) => {
      expect(categories).toContain(module.category)
    },
  )

  it('has a unique id', () => {
    const ids = modules.map((module) => module.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is reachable by id, and unknown ids return null rather than throwing', () => {
    for (const module of modules) expect(getModule(module.id)).toBe(module)
    expect(getModule('does-not-exist')).toBeNull()
    expect(getModule(undefined)).toBeNull()
  })
})

describe('modules that are built', () => {
  const ready = modules.filter((module) => module.component)

  it('there is at least one', () => {
    expect(ready.length).toBeGreaterThan(0)
  })

  it.each(ready.map((module) => [module.id, module]))(
    '%s declares the views its routes use',
    (_id, module) => {
      expect(Array.isArray(module.views)).toBe(true)
      expect(module.views.length).toBeGreaterThan(0)
      for (const view of module.views) {
        expect(view.id).toMatch(/^[a-z0-9-]+$/)
        expect(view.label).toBeTruthy()
      }
      const viewIds = module.views.map((view) => view.id)
      expect(viewIds).toContain(module.defaultView)
    },
  )

  it.each(ready.map((module) => [module.id, module]))(
    '%s exposes a component the shell can render',
    (_id, module) => {
      expect(typeof module.component).toBe('function')
    },
  )
})
