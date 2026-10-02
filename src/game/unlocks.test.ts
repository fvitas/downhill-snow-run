import { describe, expect, it } from 'vitest'
import { LEVEL_COUNT } from './levels.ts'
import { ALL_LOOKS, isFreeLook, isPremiumLook, isSpinLevel, SPIN_LEVELS } from './unlocks.ts'

describe('SPIN_LEVELS', () => {
  it('hooks at level 2, then every tenth level short of the endless last one', () => {
    expect(SPIN_LEVELS.slice(0, 3)).toEqual([2, 10, 20])
    expect(Math.max(...SPIN_LEVELS)).toBeLessThan(LEVEL_COUNT)
  })

})

describe('isSpinLevel', () => {
  it('marks only the spin levels', () => {
    expect([1, 2, 3, 10, 11, 20, 490].filter(isSpinLevel)).toEqual([2, 10, 20, 490])
  })
})

describe('ALL_LOOKS', () => {
  it('keys every look uniquely', () => {
    const keys = ALL_LOOKS.map((look) => `${look.kind}:${look.id}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('never makes a free look premium', () => {
    expect(ALL_LOOKS.filter((look) => isFreeLook(look) && isPremiumLook(look))).toEqual([])
  })

  it('holds back thirteen premium looks for Unlock all', () => {
    expect(ALL_LOOKS.filter(isPremiumLook)).toHaveLength(13)
  })
})
