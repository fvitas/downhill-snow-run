import { createElement, Crown, LockKeyhole } from 'lucide'
import { purchaseNotice } from '../game/entitlements.ts'
import { looks, setLook, SPINS, watchLooks, type Looks } from '../game/looks.ts'
import { paintBall, previewSignals, SKINS, spinStep, type BallEnv, type BallSpin } from '../game/skins.ts'
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
} from '../game/trails.ts'
import { ALL_LOOKS, isPremiumLook, lookKey, lookName, watchUnlocks, type Look } from '../game/unlocks.ts'
import type { TrailPoint } from '../game/world.ts'
import { applySolid, PRESS, withAlpha } from './glass.ts'
import { drawLookTile, sizedCanvas, trailEnvFor } from './look-tiles.ts'
import { createModal } from './modal.ts'
import { buy, owns, ownsLook, priceOf, watchPurchases } from './purchases.ts'
import { playClick } from './sound.ts'

const ink = UI_THEME.ink
const PREVIEW_HEIGHT = 120
const PREVIEW_RADIUS = 8
const PREVIEW_SPEED = 170
const POINT_SPACING = 6
const BALL_TILE = 36
const TRAIL_TILE = 44
const PREMIUM_GOLD = '#ca8a04'

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

type Tile = { look: Look; button: HTMLButtonElement; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; lock: SVGElement }

const tile = (look: Look, size: number, onPick: () => void): Tile => {
  const [canvas, ctx] = sizedCanvas(size, size)
  const button = document.createElement('button')
  button.type = 'button'
  button.ariaLabel = lookName(look)
  button.className =
    `${PRESS} relative flex aspect-square items-center justify-center rounded-2xl border-2 border-transparent`
  button.style.background = withAlpha('#ffffff', 0.55)
  const lock = createElement(LockKeyhole, { width: 11, height: 11, 'stroke-width': 2.75, 'aria-hidden': 'true' })
  lock.setAttribute('class', 'absolute right-1 top-1 opacity-60')
  button.append(canvas, lock)
  if (isPremiumLook(look)) {
    const crown = createElement(Crown, { width: 11, height: 11, 'stroke-width': 2.75, 'aria-hidden': 'true' })
    crown.setAttribute('class', 'absolute left-1 top-1')
    crown.style.color = PREMIUM_GOLD
    button.append(crown)
  }
  button.addEventListener('click', () => {
    playClick()
    onPick()
  })
  return { look, button, canvas, ctx, lock }
}

const grid = (tiles: readonly Tile[]): HTMLDivElement => {
  const element = document.createElement('div')
  element.className = 'grid w-full grid-cols-5 gap-1.5'
  element.append(...tiles.map(({ button }) => button))
  return element
}

const wideButton = (onClick: () => void): HTMLButtonElement => {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = `${PRESS} w-full rounded-2xl border px-4 py-3 text-base font-bold`
  element.addEventListener('click', () => {
    playClick()
    onClick()
  })
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
  // A locked look tapped to try it on: the preview wears it, the run doesn't.
  let trying: Look | null = null

  const shown = (): Looks => {
    const current = looks()
    if (trying?.kind === 'ball') return { ...current, ball: trying.id }
    if (trying?.kind === 'trail') return { ...current, trail: trying.id }
    return current
  }

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
    const { ball, trail: trailId, spin: spinMode } = shown()
    spin += spinStep(spinMode, step, PREVIEW_RADIUS, dx)
    const ballEnv: BallEnv = { theme: UI_THEME, spin, heading: step > 0 ? dx / step : 0, t: now / 1_000, ...previewSignals(now / 1_000) }
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
    trying = null
    notice.textContent = ''
    clearTrailFx(fx)
    sync()
  }

  const { root, sheet, open } = createModal('Locker', start, stop)

  const wear = (look: Look): void => {
    trying = null
    setLook(look.kind === 'ball' ? { ball: look.id } : { trail: look.id })
  }

  const pick = (look: Look): void => {
    notice.textContent = ''
    if (ownsLook(look)) wear(look)
    else {
      trying = trying && lookKey(trying) === lookKey(look) ? null : look
      sync()
    }
  }

  const ballTiles = ALL_LOOKS.filter((look) => look.kind === 'ball').map((look) => tile(look, BALL_TILE, () => pick(look)))
  const trailTiles = ALL_LOOKS.filter((look) => look.kind === 'trail').map((look) => tile(look, TRAIL_TILE, () => pick(look)))

  const notice = document.createElement('div')
  notice.className = 'px-1 text-center text-xs font-semibold opacity-70 empty:hidden'

  const unlockAll = wideButton(async () => {
    const outcome = await buy('looks')
    notice.textContent = purchaseNotice(outcome)
    if (outcome === 'bought' && trying) wear(trying)
  })
  applySolid(unlockAll, UI_THEME.ball, '#ffffff')

  const offers = document.createElement('div')
  offers.className = 'flex w-full flex-col gap-1.5'
  offers.append(unlockAll, notice)

  // A test switch until the spin is settled in play.
  const spinButtons = new Map<BallSpin, HTMLButtonElement>()
  for (const entry of SPINS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = entry.name
    button.className = `${PRESS} flex-1 whitespace-nowrap rounded-xl border-2 border-transparent px-1 py-1.5 text-xs font-bold`
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
  spinLabel.className = 'whitespace-nowrap px-1 text-sm font-bold'
  spinLabel.textContent = 'Ball spin'
  spinRow.append(spinLabel, ...spinButtons.values())

  const [ballTitle, ballChosen] = sectionTitle('Ball')
  const [trailTitle, trailChosen] = sectionTitle('Trail')
  const picker = document.createElement('div')
  picker.className = 'flex max-h-[42vh] w-full flex-col gap-2 overflow-y-auto p-0.5'
  picker.append(ballTitle, grid(ballTiles), trailTitle, grid(trailTiles))
  sheet.append(previewBox, offers, spinRow, picker)

  const mark = (button: HTMLButtonElement, on: boolean): void => {
    button.style.borderColor = on ? ink : 'transparent'
    button.setAttribute('aria-pressed', String(on))
  }

  const sync = (): void => {
    const current = looks()
    const tryingKey = trying ? lookKey(trying) : ''
    for (const entry of [...ballTiles, ...trailTiles]) {
      const owned = ownsLook(entry.look)
      const key = lookKey(entry.look)
      const worn = entry.look.kind === 'ball' ? entry.look.id === current.ball : entry.look.id === current.trail
      mark(entry.button, worn || key === tryingKey)
      entry.button.style.borderStyle = key === tryingKey ? 'dashed' : 'solid'
      entry.lock.style.display = owned ? 'none' : 'block'
      entry.canvas.style.opacity = owned ? '1' : '0.55'
      if (entry.ctx && entry.look.kind === 'trail') drawLookTile(entry.ctx, entry.look, current.ball, TRAIL_TILE)
    }
    for (const [id, button] of spinButtons) mark(button, id === current.spin)

    const allOwned = owns('looks') || ALL_LOOKS.every(ownsLook)
    const price = priceOf('looks')
    unlockAll.style.display = allOwned ? 'none' : 'block'
    unlockAll.textContent = price ? `Unlock all · ${price}` : 'Unlock all'

    ballChosen.textContent = SKINS.find((skin) => skin.id === current.ball)?.name ?? ''
    trailChosen.textContent = TRAILS.find((entry) => entry.id === current.trail)?.name ?? ''
  }

  for (const entry of ballTiles) if (entry.ctx) drawLookTile(entry.ctx, entry.look, 'classic', BALL_TILE)
  sync()
  watchLooks(sync)
  watchUnlocks(sync)
  watchPurchases(sync)

  return { root, open }
}
