import { describe, expect, it } from 'vitest'
import { LEVEL_COUNT } from './levels.ts'
import { ALL_LOOKS, isFreeLook, isSpinLevel, SPIN_LEVELS } from './unlocks.ts'

describe('SPIN_LEVELS', () => {
  it('hooks at level 2, then every tenth level short of the endless last one', () => {
    expect(SPIN_LEVELS.slice(0, 3)).toEqual([2, 10, 20])
    expect(Math.max(...SPIN_LEVELS)).toBeLessThan(LEVEL_COUNT)
  })

  it('earns enough spins to win every locked look', () => {
    expect(SPIN_LEVELS.length).toBeGreaterThanOrEqual(ALL_LOOKS.filter((look) => !isFreeLook(look)).length)
  })
})

describe('isSpinLevel', () => {
  it('marks only the spin levels', () => {
    expect([1, 2, 3, 10, 11, 20, 490].filter(isSpinLevel)).toEqual([2, 10, 20, 490])
  })
})
