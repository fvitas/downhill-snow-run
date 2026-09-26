const SETTING_KEYS = ['sound', 'haptics', 'shake'] as const

export type SettingKey = (typeof SETTING_KEYS)[number]
export type Settings = Record<SettingKey, boolean>

const SETTINGS_KEY = 'ski:settings'

const defaults = (): Settings => ({
  sound: true,
  haptics: true,
  // A player who asked the OS for less motion starts without the crash shake.
  shake: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
})

const load = (): Settings => {
  const settings = defaults()
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return settings
    const saved = parsed as Partial<Record<SettingKey, unknown>>
    for (const key of SETTING_KEYS) {
      const value = saved[key]
      if (typeof value === 'boolean') settings[key] = value
    }
  } catch {
    /* ignored */
  }
  return settings
}

// Loaded on first read: vite.config pulls in the sound module, and Node has no window.
let current: Settings | null = null
// The map's sheet and the pause screen both show these, and either can change them.
const listeners = new Set<() => void>()

const loaded = (): Settings => (current ??= load())

export const setting = (key: SettingKey): boolean => loaded()[key]

export const watchSettings = (listener: () => void): void => {
  listeners.add(listener)
}

export const setSetting = (key: SettingKey, value: boolean): void => {
  current = { ...loaded(), [key]: value }
  for (const listener of listeners) listener()
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current))
  } catch {
    /* ignored */
  }
}
