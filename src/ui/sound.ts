import type { Cue } from '../game/state.ts'

type SoundName = 'gate' | 'jump' | 'land' | 'pickup' | 'save' | 'penalty' | 'crash' | 'click'

const SOUND_NAMES: readonly SoundName[] = [
  'gate',
  'jump',
  'land',
  'pickup',
  'save',
  'penalty',
  'crash',
  'click',
]

export const SOUND_PATHS: readonly string[] = SOUND_NAMES.map((name) => `sounds/${name}.m4a`)

// Every file is levelled to the same peak, so these gains are the whole mix.
const CUE_SOUNDS: Partial<Record<Cue, { name: SoundName; gain: number }>> = {
  gate: { name: 'gate', gain: 0.45 },
  jump: { name: 'jump', gain: 0.4 },
  land: { name: 'land', gain: 0.6 },
  pickup: { name: 'pickup', gain: 0.5 },
  save: { name: 'save', gain: 0.6 },
  penalty: { name: 'penalty', gain: 0.65 },
  crash: { name: 'crash', gain: 0.85 },
}
const CLICK_GAIN = 0.35
// A few percent of pitch either way, so the same thud twice in a row doesn't sound pasted.
const PITCH_JITTER = 0.04

let context: AudioContext | null = null
const buffers = new Map<SoundName, AudioBuffer>()

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

const load = async (audio: AudioContext, name: SoundName): Promise<void> => {
  const response = await fetch(`/sounds/${name}.m4a`)
  buffers.set(name, await audio.decodeAudioData(await response.arrayBuffer()))
}

// WebKit only lets audio start inside a user gesture, and parks it again after the app is backgrounded.
const wake = (): void => {
  if (context && context.state !== 'running') void context.resume().catch(() => undefined)
}

export const initSound = (): void => {
  // Ambient mixes with the player's own music and obeys the silent switch.
  const session = (navigator as AudioSessionNavigator).audioSession
  if (session) session.type = 'ambient'

  const audio = new AudioContext()
  context = audio
  window.addEventListener('pointerdown', wake, true)
  window.addEventListener('touchend', wake, true)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void audio.suspend().catch(() => undefined)
    else wake()
  })

  for (const name of SOUND_NAMES) void load(audio, name).catch(() => undefined)
}

const play = (name: SoundName, gain: number, jitter: number): void => {
  const buffer = buffers.get(name)
  if (!context || context.state !== 'running' || !buffer) return
  const source = context.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = 1 + (Math.random() * 2 - 1) * jitter
  const volume = context.createGain()
  volume.gain.value = gain
  source.connect(volume).connect(context.destination)
  source.start()
}

export const playSounds = (cues: readonly Cue[]): void => {
  for (const cue of new Set(cues)) {
    const sound = CUE_SOUNDS[cue]
    if (sound) play(sound.name, sound.gain, PITCH_JITTER)
  }
}

export const playClick = (): void => play('click', CLICK_GAIN, 0)
