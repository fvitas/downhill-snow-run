export const LOGICAL_WIDTH = 540
export const LOGICAL_HEIGHT = 960

// Ball rides just below the upper third, clear of the HUD; the slope ahead fills the screen below.
export const BALL_SCREEN_Y = 0.36

// Where the tape comes to rest. The last stretch is skied, not scrolled: the camera brakes to a
// stop so the finish settles here and the ball slides down the screen to meet it.
export const FINISH_REST_Y = 0.8

const FOLLOW_PX = LOGICAL_HEIGHT * BALL_SCREEN_Y
const REST_PX = LOGICAL_HEIGHT * FINISH_REST_Y

// The ball has `REST_PX - FOLLOW_PX` of screen to cross. A camera braking as (1 - t)² hands over
// two thirds of the zone it travels, so the zone must be 1.5× that screen travel for the scroll to
// reach exactly zero at the tape — any shorter and the camera would have to reverse.
export const FINISH_EASE_PX = (REST_PX - FOLLOW_PX) * 1.5

// How far down the screen the ball has slid, `into` px into the braking zone.
export const finishDrop = (into: number): number => {
  const t = Math.min(1, Math.max(0, into / FINISH_EASE_PX))
  return FINISH_EASE_PX * (t - (1 - (1 - t) ** 3) / 3)
}

export const cameraYFor = (y: number, finish: number): number =>
  Math.min(y - FOLLOW_PX - finishDrop(y - (finish - FINISH_EASE_PX)), finish - REST_PX)

export type Viewport = {
  ctx: CanvasRenderingContext2D
  fit: () => void
}

// `host` is for the colour picker, which runs the game inside a phone frame: layout size, so a
// CSS transform on the frame doesn't feed back into the fit.
export const createViewport = (canvas: HTMLCanvasElement, host?: HTMLElement): Viewport => {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  const fit = () => {
    const availableWidth = host?.clientWidth ?? window.visualViewport?.width ?? window.innerWidth
    const availableHeight = host?.clientHeight ?? window.visualViewport?.height ?? window.innerHeight
    const scale = Math.min(availableWidth / LOGICAL_WIDTH, availableHeight / LOGICAL_HEIGHT)
    const dpr = Math.min(window.devicePixelRatio || 1, 3)

    canvas.width = Math.round(LOGICAL_WIDTH * dpr)
    canvas.height = Math.round(LOGICAL_HEIGHT * dpr)
    canvas.style.width = `${Math.round(LOGICAL_WIDTH * scale)}px`
    canvas.style.height = `${Math.round(LOGICAL_HEIGHT * scale)}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  fit()
  window.addEventListener('resize', fit)
  window.visualViewport?.addEventListener('resize', fit)

  return { ctx, fit }
}
