import { levelProgress, type GameState, type HitRecord } from '../game/state.ts'
import { appendBadHit, loadBadHits } from '../game/storage.ts'
import { UI_THEME } from '../game/themes.ts'
import { LOGICAL_WIDTH, viewHeight } from '../game/viewport.ts'
import { applyGlass, applySolid, GLASS, PRESS, withAlpha } from './glass.ts'
import { button } from './hud.ts'
import { playClick } from './sound.ts'

const ZOOM_LEVELS = [1, 2, 3, 4]
const OPEN_ZOOM = 3
// Deep enough to judge a hitbox a pixel at a time; only playtesters need it.
const DEV_ZOOM_LEVELS = [8, 16, 32]

const CRASH_LABELS: Record<HitRecord['kind'], string> = {
  tree: 'Clipped a pine',
  wall: 'Hit the edge',
  rock: 'Hit by a rock',
  boulder: 'Hit a boulder',
  log: 'Tripped on a log',
  net: 'Caught in the net',
  hole: 'Fell in a hole',
  skier: 'Crashed into a skier',
  snowmobile: 'Hit a snowmobile',
  deer: 'Ran into a deer',
  bear: 'Ran into a bear',
  kid: 'Hit a sledding kid',
  snowball: 'Hit by a snowball',
  topple: 'Caught by a falling tree',
  icicle: 'Hit by an icicle',
  snowman: 'Ran into a snowman',
  bush: 'Snagged a bush',
  gate: 'Clipped a gate',
  jump: 'Wiped out on a jump',
  wolf: 'Caught by a wolf',
  fox: 'Tripped over a fox',
}

// Lucide's `chevron-left`, inlined like the HUD's pause icon.
const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true" class="h-6 w-6"><path d="m15 18-6-6 6-6" /></svg>'

// Same line as the HUD header, so the back button and chip sit where the level bar was.
const TOP = 'top-[calc(max(env(safe-area-inset-top),2.75rem)+0.4rem)]'

export type Inspector = {
  root: HTMLElement
  open: () => void
  close: () => void
}

export const createInspector = (state: GameState, onRetry: () => void): Inspector => {
  const theme = UI_THEME
  const root = document.createElement('div')
  root.className = 'pointer-events-auto absolute inset-0 z-30 touch-none select-none'
  root.dataset.ui = ''
  root.style.display = 'none'

  const hide = (): void => {
    state.inspect.on = false
    root.style.display = 'none'
  }

  const back = button(
    '',
    `${GLASS} ${PRESS} absolute left-4 ${TOP} flex h-11 w-11 items-center justify-center rounded-full`,
    () => {
      playClick()
      hide()
    },
  )
  back.innerHTML = BACK_ICON
  applyGlass(back, theme)
  back.style.color = theme.ink

  const chipRow = document.createElement('div')
  chipRow.className = `pointer-events-none absolute inset-x-16 ${TOP} flex h-11 items-center justify-center`
  const chip = document.createElement('div')
  chip.className = `${GLASS} relative truncate rounded-full px-4 py-2 text-sm font-bold`
  applyGlass(chip, theme)
  chip.style.color = theme.ink
  chipRow.append(chip)

  const setZoom = (level: number): void => {
    playClick()
    state.inspect.target = level
    syncZoom()
  }

  const zoomButtons = ZOOM_LEVELS.map((level) =>
    button(`×${level}`, `${PRESS} h-9 w-12 rounded-full text-sm font-bold tabular-nums`, () => setZoom(level)),
  )
  const zoomSwitch = document.createElement('div')
  zoomSwitch.className = `${GLASS} relative flex gap-1 self-center rounded-full p-1`
  applyGlass(zoomSwitch, theme)
  zoomSwitch.append(...zoomButtons)

  const devZoomButtons = import.meta.env.DEV
    ? DEV_ZOOM_LEVELS.map((level) =>
        button(`×${level}`, `${PRESS} rounded-full px-3 py-1.5 text-xs font-bold tabular-nums`, () => setZoom(level)),
      )
    : []

  const syncZoom = (): void => {
    const levels = [...ZOOM_LEVELS, ...(import.meta.env.DEV ? DEV_ZOOM_LEVELS : [])]
    for (const [i, element] of [...zoomButtons, ...devZoomButtons].entries()) {
      if (levels[i] === state.inspect.target) applySolid(element, theme.ink, theme.snow)
      else {
        element.style.background = 'transparent'
        element.style.boxShadow = 'none'
        element.style.color = theme.ink
      }
    }
  }

  const hint = document.createElement('div')
  hint.className = 'text-center text-sm font-semibold transition-opacity duration-300'
  hint.textContent = 'Drag to look around'
  hint.style.color = withAlpha(theme.ink, 0.55)

  const retry = button('Let’s go again', `${PRESS} relative rounded-2xl border px-4 py-3.5 text-base font-bold`, onRetry)
  applySolid(retry, theme.ink, theme.snow)

  const bottom = document.createElement('div')
  bottom.className =
    'absolute inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] flex flex-col items-stretch gap-3'
  bottom.append(hint, zoomSwitch, retry)

  const chrome: HTMLElement[] = [back, chipRow, bottom]
  root.append(back, chipRow, bottom)

  const info = document.createElement('div')
  const flag = button('', `${PRESS} ml-auto rounded-full px-3 py-1.5 text-xs font-bold`, () => {
    if (!state.lastHit) return
    playClick()
    appendBadHit(state.lastHit, state.tuning)
    flag.textContent = `Flag bad hit (${loadBadHits().length})`
  })
  if (import.meta.env.DEV) {
    const devPanel = document.createElement('div')
    devPanel.className =
      `${GLASS} absolute inset-x-4 top-[calc(max(env(safe-area-inset-top),2.75rem)+3.9rem)] ` +
      'flex flex-col gap-2 rounded-2xl p-3'
    applyGlass(devPanel, theme)
    devPanel.style.color = theme.ink
    info.className = 'whitespace-pre-line font-mono text-[11px] leading-snug opacity-80'
    applySolid(flag, '#c2410c', '#ffffff')
    const devRow = document.createElement('div')
    devRow.className = 'flex flex-wrap items-center gap-1.5'
    devRow.append(...devZoomButtons, flag)
    devPanel.append(info, devRow)
    root.append(devPanel)
    chrome.push(devPanel)
  }

  // Drag anywhere off the controls to pan. The ball can be pushed to the screen's edge, never off it.
  let dragging = false
  root.addEventListener('pointerdown', (event: PointerEvent) => {
    if (event.target !== root) return
    dragging = true
    root.setPointerCapture(event.pointerId)
  })
  root.addEventListener('pointermove', (event: PointerEvent) => {
    if (!dragging) return
    const perPx = LOGICAL_WIDTH / Math.max(1, root.clientWidth)
    const reachX = LOGICAL_WIDTH / 2
    const reachY = viewHeight() / 2
    state.inspect.panX = Math.max(-reachX, Math.min(reachX, state.inspect.panX + event.movementX * perPx))
    state.inspect.panY = Math.max(-reachY, Math.min(reachY, state.inspect.panY + event.movementY * perPx))
    hint.style.opacity = '0'
  })
  const endDrag = (): void => {
    dragging = false
  }
  root.addEventListener('pointerup', endDrag)
  root.addEventListener('pointercancel', endDrag)

  return {
    root,
    open: () => {
      const hit = state.lastHit
      if (!hit) return
      Object.assign(state.inspect, { on: true, zoom: 1, target: OPEN_ZOOM, reveal: 0, panX: 0, panY: 0 })
      root.style.display = 'block'
      hint.style.opacity = '1'
      syncZoom()

      const label = CRASH_LABELS[hit.kind]
      chip.textContent = state.level.endless ? label : `${label} · ${Math.round(levelProgress(state) * 100)}%`

      // Springs in behind the glide, once the slope has started to move.
      for (const [i, element] of chrome.entries()) {
        element.animate(
          [
            { opacity: 0, translate: '0 14px', scale: '0.96' },
            { opacity: 1, translate: '0 0', scale: '1' },
          ],
          { duration: 320, delay: 180 + 60 * i, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.1)', fill: 'backwards' },
        )
      }

      if (!import.meta.env.DEV) return
      flag.textContent = `Flag bad hit (${loadBadHits().length})`
      const gap = hit.tree ? Math.hypot(hit.ball.x - hit.tree.x, hit.ball.y - hit.tree.y).toFixed(2) : '—'
      const box = hit.tree ? `${hit.tree.rx.toFixed(2)} × ${hit.tree.ry.toFixed(2)}` : '—'
      info.textContent =
        `${hit.kind} hit at ${hit.score} m · ${Math.round(hit.speed)} px/s · ${hit.angleDeg.toFixed(0)}°\n` +
        `ball r=${hit.ball.radius} · centre gap ${gap} px · hitbox ${box} px`
    },
    close: hide,
  }
}
