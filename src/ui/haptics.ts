import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import type { Cue } from '../game/state.ts'

const impact = (style: ImpactStyle) => (): Promise<void> => Haptics.impact({ style })
const notify = (type: NotificationType) => (): Promise<void> => Haptics.notification({ type })

const HAPTICS: Record<Cue, (() => Promise<void>) | null> = {
  nearMiss: impact(ImpactStyle.Light),
  gate: impact(ImpactStyle.Light),
  jump: null,
  land: impact(ImpactStyle.Medium),
  pickup: impact(ImpactStyle.Medium),
  save: impact(ImpactStyle.Heavy),
  penalty: impact(ImpactStyle.Heavy),
  crash: notify(NotificationType.Error),
  count: impact(ImpactStyle.Light),
  go: impact(ImpactStyle.Medium),
  finish: notify(NotificationType.Success),
  best: null,
}

export const playHaptics = (cues: readonly Cue[]): void => {
  for (const cue of new Set(cues)) void HAPTICS[cue]?.().catch(() => undefined)
}
