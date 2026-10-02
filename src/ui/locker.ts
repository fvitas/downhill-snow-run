import { looks, setLook, SPINS, watchLooks } from '../game/looks.ts'
import { paintBall, SKINS, spinStep, stillBall, tintOf, type BallEnv, type BallSpin, type SkinId } from '../game/skins.ts'
import { UI_THEME } from '../game/themes.ts'
import {
  clearTrailFx,
  createTrailFx,
  drawTrailFront,
  drawTrailFx,
  drawTrailPath,
  emitTrailFx,
  RAINBOW_HUE_PER_PX,
  stepTrailFx,
  trailHead,
  TRAILS,
  type TrailEnv,
  type TrailId,
} from '../game/trails.ts'
import type { TrailPoint } from '../game/world.ts'
import { PRESS, withAlpha } from './glass.ts'
import { createModal } from './modal.ts'
import { playClick } from './sound.ts'

const ink = UI_THEME.ink
const PREVIEW_HEIGHT = 120
const PREVIEW_RADIUS = 8
const PREVIEW_SPEED = 170
const POINT_SPACING = 6
// The tile is too short to show a rainbow at the slope's rate, so it runs the spectrum faster.
const TILE_HUE_PER_PX = 8
const BALL_TILE = 36
const TRAIL_TILE = 44
const TILE_RADIUS = 5

const sizedCanvas = (width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] => {
  const dpr = window.devicePixelRatio || 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  ctx?.scale(dpr, dpr)
  return [canvas, ctx]
}

// An S down the tile, so a trail shows how it bends as well as its colour.
const sCurve = (width: number, height: number): TrailPoint[] => {
  const points: TrailPoint[] = []
  for (let y = 5; y <= height - 9; y += 3) {
    points.push(trailHead(points, width / 2 + Math.sin((y / height) * Math.PI * 2) * width * 0.22, y))
  }
  return points
}

const trailEnvFor = (ball: SkinId, r: number, hueRate: number, ballEnv: BallEnv, ang: number): TrailEnv => ({
  r,
  theme: UI_THEME,
  tint: tintOf(ball, UI_THEME),
  t: ballEnv.t,
  ang,
  heading: ballEnv.heading,
  hueRate,
  paintBall: (ctx, x, y, radius) => paintBall(ctx, ball, x, y, radius, ballEnv),
})

const drawTrailTile = (ctx: CanvasRenderingContext2D, id: TrailId, ball: SkinId): void => {
  ctx.clearRect(0, 0, TRAIL_TILE, TRAIL_TILE)
  const points = sCurve(TRAIL_TILE, TRAIL_TILE)
  const head = points.pop()
  const before = points[points.length - 1]
  if (!head || !before) return
  const still = stillBall(UI_THEME)
  const env = trailEnvFor(ball, TILE_RADIUS, TILE_HUE_PER_PX, still, Math.atan2(head.y - before.y, head.x - before.x))
  drawTrailPath(ctx, id, points, head, 0, env)
  const fx = createTrailFx()
  let previous = points[0]
  for (const point of points) {
    if (previous) emitTrailFx(fx, id, point.x, point.y, point.d - previous.d, env)
    previous = point
  }
  drawTrailFx(ctx, fx, 0, TRAIL_TILE, env)
  paintBall(ctx, ball, head.x, head.y, TILE_RADIUS, still)
  drawTrailFront(ctx, id, points, head, 0, env)
}

const sectionTitle = (text: string): [HTMLDivElement, HTMLSpanElement] => {
  const row = document.createElement('div')
  row.className = 'flex w-full items-baseline justify-between px-1 text-sm font-bold'
  const label = document.createElement('span')
  label.textContent = text
  const chosen = document.createElement('span')
  chosen.className = 'text-xs font-semibold opacity-60'
  row.append(label, chosen)
  return [row, chosen]
}

const tile = (name: string, canvas: HTMLCanvasElement, onPick: () => void): HTMLButtonElement => {
  const element = document.createElement('button')
  element.type = 'button'
  element.ariaLabel = name
  element.className =
    `${PRESS} flex aspect-square items-center justify-center rounded-2xl border-2 border-transparent`
  element.style.background = withAlpha('#ffffff', 0.55)
  element.append(canvas)
  element.addEventListener('click', () => {
    playClick()
    onPick()
  })
  return element
}

const grid = (tiles: readonly HTMLElement[]): HTMLDivElement => {
  const element = document.createElement('div')
  element.className = 'grid w-full grid-cols-5 gap-1.5'
  element.append(...tiles)
  return element
}

export type Locker = { root: HTMLElement; open: () => void }

export const createLocker = (): Locker => {
  const [preview, previewCtx] = sizedCanvas(1, PREVIEW_HEIGHT)
  preview.className = 'rounded-2xl'
  const previewBox = document.createElement('div')
  previewBox.className = 'w-full'
  previewBox.append(preview)
  const fx = createTrailFx()
  const trail: TrailPoint[] = []
  let travel = 0
  let spin = 0
  let frame = 0
  let previous = 0

  const sizePreview = (): number => {
    const width = previewBox.clientWidth
    const dpr = window.devicePixelRatio || 1
    if (width > 0 && preview.width !== Math.round(width * dpr)) {
      preview.width = Math.round(width * dpr)
      preview.height = Math.round(PREVIEW_HEIGHT * dpr)
      preview.style.width = `${width}px`
      previewCtx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    return width
  }

  // The ball holds still near the bottom and the slope streams up past it, like the game's camera.
  const tick = (now: number): void => {
    frame = requestAnimationFrame(tick)
    const dt = Math.min((now - previous) / 1_000, 0.05)
    previous = now
    const width = sizePreview()
    if (!previewCtx || width === 0) return

    const beforeX = width / 2 + Math.sin(travel / 60) * width * 0.3
    const beforeY = travel
    travel += PREVIEW_SPEED * dt
    const x = width / 2 + Math.sin(travel / 60) * width * 0.3
    const dx = x - beforeX
    const dy = travel - beforeY
    const step = Math.hypot(dx, dy)
    const head = trailHead(trail, x, travel)
    const last = trail[trail.length - 1]
    if (!last || Math.hypot(head.x - last.x, head.y - last.y) > POINT_SPACING) trail.push(head)
    const camY = travel - PREVIEW_HEIGHT * 0.72
    while ((trail[0]?.y ?? Infinity) < camY - 20) trail.shift()
    const { ball, trail: trailId, spin: spinMode } = looks()
    spin += spinStep(spinMode, step, PREVIEW_RADIUS, dx)
    const ballEnv: BallEnv = { theme: UI_THEME, spin, heading: step > 0 ? dx / step : 0, t: now / 1_000 }
    const env = trailEnvFor(ball, PREVIEW_RADIUS, RAINBOW_HUE_PER_PX, ballEnv, Math.atan2(dy, dx))
    emitTrailFx(fx, trailId, head.x, head.y, step, env)
    stepTrailFx(fx, dt)

    previewCtx.fillStyle = UI_THEME.snow
    previewCtx.fillRect(0, 0, width, PREVIEW_HEIGHT)
    drawTrailPath(previewCtx, trailId, trail, head, camY, env)
    drawTrailFx(previewCtx, fx, camY, PREVIEW_HEIGHT, env)
    previewCtx.fillStyle = UI_THEME.shadow
    previewCtx.beginPath()
    previewCtx.ellipse(head.x - PREVIEW_RADIUS * 0.7, head.y - camY + PREVIEW_RADIUS * 0.45, PREVIEW_RADIUS * 1.1, PREVIEW_RADIUS * 0.55, 0, 0, Math.PI * 2)
    previewCtx.fill()
    paintBall(previewCtx, ball, head.x, head.y - camY, PREVIEW_RADIUS, ballEnv)
    drawTrailFront(previewCtx, trailId, trail, head, camY, env)
  }

  const start = (): void => {
    previous = performance.now()
    frame = requestAnimationFrame(tick)
  }
  const stop = (): void => {
    cancelAnimationFrame(frame)
    trail.length = 0
    spin = 0
    clearTrailFx(fx)
  }

  const { root, sheet, open } = createModal('Locker', start, stop)

  const ballTiles = new Map<SkinId, HTMLButtonElement>()
  for (const skin of SKINS) {
    const [canvas, ctx] = sizedCanvas(BALL_TILE, BALL_TILE)
    if (ctx) paintBall(ctx, skin.id, BALL_TILE / 2, BALL_TILE / 2, 13, stillBall(UI_THEME))
    ballTiles.set(skin.id, tile(skin.name, canvas, () => setLook({ ball: skin.id })))
  }

  const trailTiles = new Map<TrailId, { button: HTMLButtonElement; ctx: CanvasRenderingContext2D | null }>()
  for (const entry of TRAILS) {
    const [canvas, ctx] = sizedCanvas(TRAIL_TILE, TRAIL_TILE)
    trailTiles.set(entry.id, { button: tile(entry.name, canvas, () => setLook({ trail: entry.id })), ctx })
  }

  // A test switch until the spin is settled in play.
  const spinButtons = new Map<BallSpin, HTMLButtonElement>()
  for (const entry of SPINS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = entry.name
    button.className = `${PRESS} flex-1 rounded-xl border-2 border-transparent py-1.5 text-xs font-bold`
    button.style.background = withAlpha('#ffffff', 0.55)
    button.addEventListener('click', () => {
      playClick()
      setLook({ spin: entry.id })
    })
    spinButtons.set(entry.id, button)
  }
  const spinRow = document.createElement('div')
  spinRow.className = 'flex w-full items-center gap-1.5'
  const spinLabel = document.createElement('span')
  spinLabel.className = 'px-1 text-sm font-bold'
  spinLabel.textContent = 'Spin'
  spinRow.append(spinLabel, ...spinButtons.values())

  const [ballTitle, ballChosen] = sectionTitle('Ball')
  const [trailTitle, trailChosen] = sectionTitle('Trail')
  const picker = document.createElement('div')
  picker.className = 'flex max-h-[48vh] w-full flex-col gap-2 overflow-y-auto p-0.5'
  picker.append(ballTitle, grid([...ballTiles.values()]), trailTitle, grid([...trailTiles.values()].map(({ button }) => button)))
  sheet.append(previewBox, spinRow, picker)

  const mark = (button: HTMLButtonElement, on: boolean): void => {
    button.style.borderColor = on ? ink : 'transparent'
    button.setAttribute('aria-pressed', String(on))
  }

  const sync = (): void => {
    const current = looks()
    for (const [id, button] of ballTiles) mark(button, id === current.ball)
    for (const [id, button] of spinButtons) mark(button, id === current.spin)
    for (const [id, { button, ctx }] of trailTiles) {
      mark(button, id === current.trail)
      // The trail tiles end in the chosen ball, so both picks are seen together.
      if (ctx) drawTrailTile(ctx, id, current.ball)
    }
    ballChosen.textContent = SKINS.find((skin) => skin.id === current.ball)?.name ?? ''
    trailChosen.textContent = TRAILS.find((entry) => entry.id === current.trail)?.name ?? ''
  }
  sync()
  watchLooks(sync)

  return { root, open }
}
