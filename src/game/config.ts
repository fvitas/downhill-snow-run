export type TuningConfig = {
  baseSpeed: number
  maxSpeed: number
  speedRampPer1000: number
  turnAngleDeg: number
  turnRateDegPerSec: number
  ballRadius: number
  treesPer1000: number
  minGapPx: number
  treeHitScale: number
  hitForgivePx: number
  hitDepthScale: number
  grazePx: number
  finishDistanceM: number
}

export type TuningField = {
  key: keyof TuningConfig
  label: string
  min: number
  max: number
  step: number
  unit: string
}

export const TUNING_FIELDS: readonly TuningField[] = [
  { key: 'baseSpeed', label: 'Base speed', min: 100, max: 900, step: 5, unit: 'px/s' },
  { key: 'maxSpeed', label: 'Max speed', min: 150, max: 1_800, step: 10, unit: 'px/s' },
  { key: 'speedRampPer1000', label: 'Speed ramp', min: 0, max: 120, step: 1, unit: 'px/s per 1k' },
  { key: 'turnAngleDeg', label: 'Travel angle', min: 10, max: 60, step: 1, unit: '°' },
  { key: 'turnRateDegPerSec', label: 'Turn rate', min: 40, max: 1_600, step: 10, unit: '°/s' },
  { key: 'ballRadius', label: 'Ball radius', min: 6, max: 30, step: 1, unit: 'px' },
  { key: 'treesPer1000', label: 'Tree density', min: 1, max: 80, step: 1, unit: 'per 1k' },
  { key: 'minGapPx', label: 'Min gap', min: 30, max: 260, step: 5, unit: 'px' },
  { key: 'treeHitScale', label: 'Trunk hitbox', min: 1, max: 8, step: 0.25, unit: '× trunk' },
  { key: 'hitForgivePx', label: 'Graze forgiveness', min: 0, max: 10, step: 0.5, unit: 'px' },
  { key: 'hitDepthScale', label: 'Hit depth', min: 0.15, max: 1, step: 0.05, unit: '× width' },
  { key: 'grazePx', label: 'Near-miss reach', min: 20, max: 90, step: 1, unit: 'px' },
  { key: 'finishDistanceM', label: 'Finish line', min: 100, max: 3_000, step: 50, unit: 'm' },
]

export type PresetName = 'snappy' | 'floaty' | 'heavy'

export const PRESET_NAMES: readonly PresetName[] = ['snappy', 'floaty', 'heavy']

export const PRESETS: Record<PresetName, TuningConfig> = {
  snappy: {
    baseSpeed: 230,
    maxSpeed: 510,
    speedRampPer1000: 8,
    turnAngleDeg: 35,
    turnRateDegPerSec: 260,
    ballRadius: 7,
    treesPer1000: 32,
    minGapPx: 70,
    treeHitScale: 1,
    hitForgivePx: 4,
    hitDepthScale: 0.5,
    grazePx: 45,
    finishDistanceM: 500,
  },
  floaty: {
    baseSpeed: 195,
    maxSpeed: 440,
    speedRampPer1000: 7,
    turnAngleDeg: 35,
    turnRateDegPerSec: 200,
    ballRadius: 7,
    treesPer1000: 28,
    minGapPx: 80,
    treeHitScale: 1,
    hitForgivePx: 4,
    hitDepthScale: 0.5,
    grazePx: 45,
    finishDistanceM: 500,
  },
  heavy: {
    baseSpeed: 220,
    maxSpeed: 580,
    speedRampPer1000: 10,
    turnAngleDeg: 35,
    turnRateDegPerSec: 150,
    ballRadius: 8,
    treesPer1000: 24,
    minGapPx: 90,
    treeHitScale: 1,
    hitForgivePx: 4,
    hitDepthScale: 0.5,
    grazePx: 45,
    finishDistanceM: 500,
  },
}

export const DEFAULT_PRESET: PresetName = 'snappy'
