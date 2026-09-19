import { PRESETS, TUNING_FIELDS, type PresetName, type TuningConfig } from './config.ts'
import type { HitRecord } from './state.ts'

const STORAGE_KEY = 'ski:tuning'
const BAD_HITS_KEY = 'ski:badhits'
const MAX_BAD_HITS = 50

export type BadHit = HitRecord & { tuning: TuningConfig; at: string }

export const loadBadHits = (): BadHit[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(BAD_HITS_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as BadHit[]) : []
  } catch {
    return []
  }
}

export const appendBadHit = (hit: HitRecord, tuning: TuningConfig): number => {
  const hits = loadBadHits()
  hits.push({ ...hit, tuning: { ...tuning }, at: new Date().toISOString() })
  const trimmed = hits.slice(-MAX_BAD_HITS)
  try {
    localStorage.setItem(BAD_HITS_KEY, JSON.stringify(trimmed))
  } catch {
    /* ignored */
  }
  return trimmed.length
}

export const clearBadHits = (): void => {
  try {
    localStorage.removeItem(BAD_HITS_KEY)
  } catch {
    /* ignored */
  }
}

export const loadTuning = (fallback: PresetName): TuningConfig => {
  const base = { ...PRESETS[fallback] }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return base

    const record = parsed as Record<string, unknown>
    for (const field of TUNING_FIELDS) {
      const value = record[field.key]
      // Clamped to the field range so a save from before a range change can't resurrect a bad value.
      if (typeof value === 'number' && Number.isFinite(value)) {
        base[field.key] = Math.min(Math.max(value, field.min), field.max)
      }
    }
    return base
  } catch {
    return base
  }
}

export const saveTuning = (tuning: TuningConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning))
  } catch {
    /* private mode or quota — tuning just won't survive reload */
  }
}

export const clearTuning = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignored */
  }
}
