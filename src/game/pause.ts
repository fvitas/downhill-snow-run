import { runOver, type GameState } from './state.ts'

type OrientationLockScreen = ScreenOrientation & {
  lock?: (orientation: 'portrait') => Promise<void>
}

export const tryLockPortrait = async (): Promise<void> => {
  const orientation = screen.orientation as OrientationLockScreen | undefined
  // Browsers outside fullscreen reject this; the overlay is the fallback.
  try {
    await orientation?.lock?.('portrait')
  } catch {
    /* ignored */
  }
}

export type PauseControl = { pause: () => void }

export const attachPause = (
  state: GameState,
  overlay: HTMLElement,
  message: HTMLElement,
  // Shown under the message on a real pause, never on the rotate prompt.
  controls?: HTMLElement,
): PauseControl => {
  let blockedByOrientation = false

  const show = (text: string) => {
    message.textContent = text
    if (controls) controls.style.display = blockedByOrientation ? 'none' : ''
    overlay.style.display = 'flex'
    state.paused = true
    state.pressed = false
  }

  const hide = () => {
    overlay.style.display = 'none'
    state.paused = false
  }

  // The map and the crash or finish card have nothing to resume, so leaving the app there is not a pause.
  const pauseIfRunning = () => {
    if (state.screen === 'run' && !runOver(state)) show('Tap to continue')
  }

  // Only a touch device can rotate into portrait; a desktop window is landscape and must not
  // be told to turn itself around.
  const rotatable = window.matchMedia('(pointer: coarse)').matches

  const evaluate = () => {
    blockedByOrientation = rotatable && window.innerWidth > window.innerHeight
    if (blockedByOrientation) {
      show('Rotate to portrait')
    } else if (document.hidden) {
      pauseIfRunning()
    }
  }

  overlay.addEventListener('pointerdown', (event: PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!blockedByOrientation) hide()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseIfRunning()
  })

  window.addEventListener('resize', evaluate)
  window.addEventListener('orientationchange', evaluate)

  evaluate()

  return { pause: () => show('Tap to continue') }
}
