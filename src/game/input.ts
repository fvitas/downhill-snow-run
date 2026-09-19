import { runActive, type GameState } from './state.ts'
import { flip } from './physics.ts'

// The tuning panel lives inside the input target, so its own pointer/key handling must win.
const inUi = (node: EventTarget | null): boolean =>
  node instanceof Element && node.closest('[data-ui]') !== null

export const attachInput = (state: GameState, target: HTMLElement): void => {
  const press = () => {
    // A tap that dismisses the pause or game-over overlay is swallowed, never counted as a flip.
    if (!runActive(state) || state.screen !== 'run') return
    if (state.pressed) return
    state.pressed = true
    flip(state)
  }

  const release = () => {
    state.pressed = false
  }

  target.addEventListener('pointerdown', (event: PointerEvent) => {
    // preventDefault here would cancel a slider drag, so UI taps bail before it.
    if (inUi(event.target)) return
    event.preventDefault()
    press()
  })

  target.addEventListener('pointerup', release)
  target.addEventListener('pointercancel', release)
  window.addEventListener('blur', release)

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.code !== 'Space' || event.repeat) return
    if (inUi(document.activeElement)) return
    event.preventDefault()
    press()
  })

  window.addEventListener('keyup', (event: KeyboardEvent) => {
    if (event.code === 'Space') release()
  })
}
