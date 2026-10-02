import { SKINS, type BallSpin, type SkinId } from './skins.ts'
import { TRAILS, type TrailId } from './trails.ts'

export type Looks = { ball: SkinId; trail: TrailId; spin: BallSpin }

export const SPINS: readonly { id: BallSpin; name: string }[] = [
  { id: 'off', name: 'Off' },
  { id: 'roll', name: 'One way' },
  { id: 'turns', name: 'With turns' },
]

const LOOKS_KEY = 'ski:looks'

const load = (): Looks => {
  const looks: Looks = { ball: 'classic', trail: 'classic', spin: 'off' }
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LOOKS_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return looks
    const saved = parsed as Partial<Record<keyof Looks, unknown>>
    const ball = SKINS.find((skin) => skin.id === saved.ball)
    const trail = TRAILS.find((entry) => entry.id === saved.trail)
    const spin = SPINS.find((entry) => entry.id === saved.spin)
    if (ball) looks.ball = ball.id
    if (trail) looks.trail = trail.id
    if (spin) looks.spin = spin.id
  } catch {
    /* ignored */
  }
  return looks
}

let current: Looks | null = null
const listeners = new Set<() => void>()

export const looks = (): Looks => (current ??= load())

export const watchLooks = (listener: () => void): void => {
  listeners.add(listener)
}

export const setLook = (patch: Partial<Looks>): void => {
  current = { ...looks(), ...patch }
  for (const listener of listeners) listener()
  try {
    localStorage.setItem(LOOKS_KEY, JSON.stringify(current))
  } catch {
    /* ignored */
  }
}
