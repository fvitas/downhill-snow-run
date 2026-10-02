import { LEVEL_COUNT } from './levels.ts'
import { isPremiumSkin, SKINS, type SkinId } from './skins.ts'
import { isPremiumTrail, TRAILS, type TrailId } from './trails.ts'

export type Look = { kind: 'ball'; id: SkinId } | { kind: 'trail'; id: TrailId }

const UNLOCKS_KEY = 'ski:unlocks'

// Level 2 hooks the wheel early, then every tenth level. The last level is endless and never cleared.
export const SPIN_LEVELS: readonly number[] = [
  2,
  ...Array.from({ length: Math.floor((LEVEL_COUNT - 1) / 10) }, (_, i) => (i + 1) * 10),
]

export const ALL_LOOKS: readonly Look[] = [
  ...SKINS.map((skin): Look => ({ kind: 'ball', id: skin.id })),
  ...TRAILS.map((entry): Look => ({ kind: 'trail', id: entry.id })),
]

export const lookKey = (look: Look): string => `${look.kind}:${look.id}`

export const isFreeLook = (look: Look): boolean => look.id === 'classic'

// Premium looks never land on the wheel; only Unlock all brings them.
export const isPremiumLook = (look: Look): boolean => (look.kind === 'ball' ? isPremiumSkin(look.id) : isPremiumTrail(look.id))

export const lookName = (look: Look): string =>
  (look.kind === 'ball' ? SKINS.find((skin) => skin.id === look.id) : TRAILS.find((entry) => entry.id === look.id))
    ?.name ?? ''

export const isSpinLevel = (level: number): boolean => SPIN_LEVELS.includes(level)

// `spun` holds the spin levels whose one spin is used up, spun or walked away from, so replaying them gives nothing.
type Saved = { won: string[]; spun: number[] }

const load = (): Saved => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(UNLOCKS_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return { won: [], spun: [] }
    const saved = parsed as Partial<Record<keyof Saved, unknown>>
    const keys = new Set(ALL_LOOKS.map(lookKey))
    return {
      won: Array.isArray(saved.won) ? saved.won.filter((key): key is string => keys.has(String(key))) : [],
      spun: Array.isArray(saved.spun) ? saved.spun.filter((level): level is number => typeof level === 'number' && isSpinLevel(level)) : [],
    }
  } catch {
    return { won: [], spun: [] }
  }
}

const saved = load()
const won = new Set(saved.won)
const spun = new Set(saved.spun)
const listeners = new Set<() => void>()

const changed = (): void => {
  try {
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify({ won: [...won], spun: [...spun] }))
  } catch {
    /* ignored */
  }
  for (const listener of listeners) listener()
}

export const watchUnlocks = (listener: () => void): void => {
  listeners.add(listener)
}

export const spinTaken = (level: number): boolean => spun.has(level)

export const wonLook = (look: Look): boolean => won.has(lookKey(look))

export const takeSpin = (level: number): void => {
  spun.add(level)
  changed()
}

export const winLook = (prize: Look): void => {
  won.add(lookKey(prize))
  changed()
}
