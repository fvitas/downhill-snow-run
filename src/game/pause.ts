import type { GameState } from './state.ts'

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

export const attachPause = (state: GameState, overlay: HTMLElement, message: HTMLElement): void => {
  let blockedByOrientation = false

  const show = (text: string) => {
    message.textContent = text
    overlay.style.display = 'flex'
    state.paused = true
    state.pressed = false
  }

  const hide = () => {
    overlay.style.display = 'none'
    state.paused = false
  }

  const evaluate = () => {
    blockedByOrientation = window.innerWidth > window.innerHeight
    if (blockedByOrientation) {
      show('Rotate to portrait')
    } else if (document.hidden) {
      show('Tap to continue')
    }
  }

  overlay.addEventListener('pointerdown', (event: PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!blockedByOrientation) hide()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) show('Tap to continue')
  })

  window.addEventListener('resize', evaluate)
  window.addEventListener('orientationchange', evaluate)

  evaluate()
}
