export const LOGICAL_WIDTH = 540
export const LOGICAL_HEIGHT = 960

// Ball rides in the upper third; the slope ahead fills the rest of the screen below it.
export const BALL_SCREEN_Y = 0.3

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
