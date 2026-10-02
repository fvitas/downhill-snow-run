import { describe, expect, it } from 'vitest'
import { buildCourse, crashWorthReviving, levelAt } from './levels.ts'
import { METRES_PER_POINT } from './world.ts'

describe('crashWorthReviving', () => {
  const level = levelAt(21)
  const { perfectScore } = buildCourse(level)
  const distanceAt = (progress: number): number => Math.round((level.distanceM / METRES_PER_POINT) * progress)

  it('passes on a crash before halfway, however well it went', () => {
    expect(crashWorthReviving(level, perfectScore, perfectScore, 0.45)).toBe(false)
  })

  it('passes on a run that only dodged', () => {
    expect(crashWorthReviving(level, distanceAt(0.8), perfectScore, 0.8)).toBe(false)
  })

  it('passes on a run only on pace for Good run!', () => {
    expect(crashWorthReviving(level, Math.round(perfectScore * 0.2 * 0.6), perfectScore, 0.6)).toBe(false)
  })

  it('offers it to a run past halfway on pace for Great run!', () => {
    expect(crashWorthReviving(level, Math.round(perfectScore * 0.27 * 0.6), perfectScore, 0.6)).toBe(true)
  })

  it('never offers it on the endless level, which has no perfect score', () => {
    expect(crashWorthReviving(levelAt(500), 10_000, 0, 1)).toBe(false)
  })
})
