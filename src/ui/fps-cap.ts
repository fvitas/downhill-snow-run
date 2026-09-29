import { Capacitor, registerPlugin } from '@capacitor/core'
import { setting, watchSettings } from '../game/settings.ts'

type FrameRatePlugin = { set: (options: { cap: boolean }) => Promise<void> }

const FrameRate = registerPlugin<FrameRatePlugin>('FrameRate')

// iOS already drops its refresh rate when frames fall behind; Android can hold 90 Hz and judder.
export const hasFpsCap = Capacitor.getPlatform() === 'android'

const apply = (): void => {
  void FrameRate.set({ cap: setting('fpsCap') }).catch(() => undefined)
}

export const startFpsCap = (): void => {
  if (!hasFpsCap) return
  apply()
  watchSettings(apply)
}
